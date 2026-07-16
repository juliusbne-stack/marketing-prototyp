import { prisma } from "@/lib/prisma";
import { DEMO_FIXTURE } from "@/scripts/demo-fixture-data";
import { demoDelay } from "@/lib/demo/delay";
import { DemoAiPreconditionError } from "@/lib/demo/fakeAi/phase3";
import { isActiveAdopted } from "@/lib/statementFilters";

const feedbackSelect = {
  id: true,
  projectId: true,
  stepId: true,
  statementId: true,
  content: true,
  result: true,
  interpretation: true,
  proposedNewStatus: true,
  statusApplied: true,
} as const;

const statementSelect = {
  id: true,
  projectId: true,
  phase: true,
  category: true,
  content: true,
  evidenceStatus: true,
  origin: true,
  justification: true,
  sourceRef: true,
  uncertainty: true,
  isCritical: true,
  adopted: true,
  segmentLabel: true,
  segmentAspect: true,
} as const;

export async function serveDemoPhase5(projectId: string) {
  await demoDelay(900);

  const option = await prisma.strategyOption.findFirst({
    where: { projectId, status: "PRIORITIZED" },
    include: {
      statements: {
        include: {
          statement: {
            select: {
              id: true,
              category: true,
              content: true,
              evidenceStatus: true,
              adopted: true,
              supersededByStatementId: true,
            },
          },
        },
      },
    },
  });

  if (!option) {
    throw new DemoAiPreconditionError(
      "Es gibt keine priorisierte Option. Priorisiere zuerst in Phase 3 eine Option."
    );
  }

  const steps = await prisma.validationStep.findMany({
    where: { optionId: option.id, adopted: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true, assumptionId: true },
  });

  const feedbacks = await prisma.marketFeedback.findMany({
    where: { stepId: { in: steps.map((step) => step.id) } },
    orderBy: { createdAt: "asc" },
    select: feedbackSelect,
  });

  if (feedbacks.length === 0) {
    throw new DemoAiPreconditionError(
      "Es liegen noch keine Marktrückmeldungen vor. Erfasse zuerst je Umsetzungsschritt, was passiert ist."
    );
  }

  const fixtureFeedbacks = Object.values(DEMO_FIXTURE.feedbacks);
  const fixtureSteps = Object.values(DEMO_FIXTURE.validationSteps);

  const stepKeyByLiveId = new Map<string, string>();
  for (const live of steps) {
    const fixture = fixtureSteps.find((entry) => entry.title === live.title);
    if (fixture) stepKeyByLiveId.set(live.id, fixture.key);
  }
  // Fallback by order
  steps.forEach((live, index) => {
    if (!stepKeyByLiveId.has(live.id) && fixtureSteps[index]) {
      stepKeyByLiveId.set(live.id, fixtureSteps[index]!.key);
    }
  });

  const fixtureByStepKey = new Map(
    fixtureFeedbacks.map((entry) => [entry.stepKey, entry])
  );

  const dimensions = option.statements
    .map((link) => link.statement)
    .filter((statement) => isActiveAdopted(statement));

  const completedRuns = await prisma.adaptationDecision.count({
    where: { optionId: option.id, userConfirmed: true },
  });

  const evidenceBalance = {
    dimensions: {
      total: dimensions.length,
      fact: dimensions.filter((s) => s.evidenceStatus === "FACT").length,
      assumption: dimensions.filter((s) => s.evidenceStatus === "ASSUMPTION")
        .length,
      openQuestion: dimensions.filter(
        (s) => s.evidenceStatus === "OPEN_QUESTION"
      ).length,
    },
    criticalAssumptionResults: {
      supported: 0,
      partiallySupported: 0,
      refuted: 0,
    },
    validationRun: completedRuns + 1,
  };

  const learningFixtures = Object.values(DEMO_FIXTURE.statements).filter(
    (s) => s.phase === 5 && s.category === "LEARNING"
  );

  const { updatedFeedbacks, newStatements } = await prisma.$transaction(
    async (tx) => {
      for (const feedback of feedbacks) {
        if (!feedback.stepId) continue;
        const stepKey = stepKeyByLiveId.get(feedback.stepId);
        const fixture = stepKey ? fixtureByStepKey.get(stepKey) : undefined;
        if (!fixture) continue;

        await tx.marketFeedback.update({
          where: { id: feedback.id },
          data: {
            content: fixture.content,
            result: fixture.result,
            interpretation: fixture.interpretation ?? null,
            proposedNewStatus: fixture.proposedNewStatus ?? null,
            statusApplied: false,
          },
        });

        if (fixture.result === "SUPPORTED") {
          evidenceBalance.criticalAssumptionResults.supported += 1;
        } else if (fixture.result === "PARTIALLY_SUPPORTED") {
          evidenceBalance.criticalAssumptionResults.partiallySupported += 1;
        } else if (fixture.result === "REFUTED") {
          evidenceBalance.criticalAssumptionResults.refuted += 1;
        }
      }

      await tx.statement.deleteMany({
        where: {
          projectId,
          phase: 5,
          category: "LEARNING",
          adopted: false,
        },
      });

      for (const statement of learningFixtures) {
        await tx.statement.create({
          data: {
            projectId,
            phase: 5,
            category: "LEARNING",
            content: statement.content,
            evidenceStatus: statement.evidenceStatus,
            origin: statement.origin,
            justification: statement.justification ?? null,
            uncertainty: statement.uncertainty ?? null,
            adopted: false,
          },
        });
      }

      return {
        updatedFeedbacks: await tx.marketFeedback.findMany({
          where: { id: { in: feedbacks.map((feedback) => feedback.id) } },
          orderBy: { createdAt: "asc" },
          select: feedbackSelect,
        }),
        newStatements: await tx.statement.findMany({
          where: { projectId, phase: 5, category: "LEARNING" },
          orderBy: { createdAt: "asc" },
          select: statementSelect,
        }),
      };
    }
  );

  const adaptation = DEMO_FIXTURE.adaptation;

  return {
    feedbacks: updatedFeedbacks.map((feedback) => ({
      ...feedback,
      proxyDamped: false,
    })),
    newStatements,
    adaptation: {
      decision: adaptation.decision,
      loopBackToPhase: adaptation.loopBackToPhase ?? null,
      rationale: adaptation.rationale,
    },
    evidenceBalance,
  };
}
