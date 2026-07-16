import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isActiveAdopted } from "@/lib/statementFilters";
import { callLLM, LlmValidationError } from "@/lib/openai";
import { dampenProxyResults, wasProxyDamped } from "@/lib/phase5/guards";
import { PHASE5_PROMPT } from "@/lib/prompts/phase5";
import { phase5ResponseSchema } from "@/lib/schemas/phase5";
import { isDemoProject } from "@/lib/demo/identity";
import {
  DemoAiPreconditionError,
  serveDemoPhase5,
} from "@/lib/demo/fakeAi";

const requestSchema = z.object({
  projectId: z.string().min(1),
});

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

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "projectId fehlt in der Anfrage." },
      { status: 400 }
    );
  }

  const project = await prisma.project.findUnique({
    where: { id: parsed.data.projectId },
  });

  if (!project) {
    return NextResponse.json(
      { error: "Das Projekt wurde nicht gefunden." },
      { status: 404 }
    );
  }

  if (isDemoProject(project)) {
    try {
      const payload = await serveDemoPhase5(project.id);
      return NextResponse.json(payload, { status: 201 });
    } catch (error) {
      if (error instanceof DemoAiPreconditionError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }
  }

  const option = await prisma.strategyOption.findFirst({
    where: { projectId: project.id, status: "PRIORITIZED" },
    include: {
      statements: {
        include: {
          statement: {
            select: {
              id: true,
              category: true,
              content: true,
              evidenceStatus: true,
              origin: true,
              justification: true,
              uncertainty: true,
              adopted: true,
              supersededByStatementId: true,
            },
          },
        },
      },
    },
  });

  if (!option) {
    return NextResponse.json(
      {
        error:
          "Es gibt keine priorisierte Option. Priorisiere zuerst in Phase 3 eine Option.",
      },
      { status: 400 }
    );
  }

  // Only adopted validation steps take part in the learning loop.
  const steps = await prisma.validationStep.findMany({
    where: { optionId: option.id, adopted: true },
    orderBy: { createdAt: "asc" },
    include: {
      metrics: {
        select: {
          name: true,
          successCriterion: true,
          failureCriterion: true,
          metricRole: true,
          evaluationMode: true,
          proxyStrength: true,
          signalRationale: true,
        },
      },
      assumption: {
        select: {
          id: true,
          category: true,
          segmentAspect: true,
          content: true,
          evidenceStatus: true,
          justification: true,
          uncertainty: true,
        },
      },
    },
  });

  const feedbacks = await prisma.marketFeedback.findMany({
    where: { stepId: { in: steps.map((step) => step.id) } },
    orderBy: { createdAt: "asc" },
    select: feedbackSelect,
  });

  if (feedbacks.length === 0) {
    return NextResponse.json(
      {
        error:
          "Es liegen noch keine Marktrückmeldungen vor. Erfasse zuerst je Umsetzungsschritt, was passiert ist.",
      },
      { status: 400 }
    );
  }

  // Evidence balance of the prioritized option, computed BEFORE this
  // evaluation run: dimension counts by evidence status, results of all
  // previous assessments and the current validation run number. It anchors
  // the AI's adaptation proposal (CONTINUE vs. ADAPT) and is shown in the UI.
  const dimensions = option.statements
    .map((link) => link.statement)
    .filter((statement) => isActiveAdopted(statement));
  const assessedFeedbacks = feedbacks.filter(
    (feedback) => feedback.interpretation !== null
  );
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
      supported: assessedFeedbacks.filter((f) => f.result === "SUPPORTED")
        .length,
      partiallySupported: assessedFeedbacks.filter(
        (f) => f.result === "PARTIALLY_SUPPORTED"
      ).length,
      refuted: assessedFeedbacks.filter((f) => f.result === "REFUTED").length,
    },
    validationRun: completedRuns + 1,
  };

  // Validation history per tested statement (state BEFORE this run): how
  // often previous assessments supported, partially supported or refuted the
  // assumption. Anchors the staged status proposal in the phase 5 prompt.
  const historyByStatement = new Map<
    string,
    {
      supported: number;
      partiallySupported: number;
      refuted: number;
      ambiguous: number;
    }
  >();
  for (const feedback of assessedFeedbacks) {
    const counts = historyByStatement.get(feedback.statementId) ?? {
      supported: 0,
      partiallySupported: 0,
      refuted: 0,
      ambiguous: 0,
    };
    if (feedback.result === "SUPPORTED") counts.supported += 1;
    else if (feedback.result === "PARTIALLY_SUPPORTED")
      counts.partiallySupported += 1;
    else if (feedback.result === "REFUTED") counts.refuted += 1;
    else counts.ambiguous += 1;
    historyByStatement.set(feedback.statementId, counts);
  }

  // Context rule: profile + prioritized option (adopted dimensions) + the
  // tested assumptions with their steps, metrics and user feedback.
  const context = {
    startupProfile: {
      businessIdea: project.businessIdea,
      productStatus: project.productStatus,
      assumedTarget: project.assumedTarget,
      assumedProblem: project.assumedProblem,
      valueProposition: project.valuePropDraft,
      revenueIdea: project.revenueIdea,
      region: project.region,
      teamSize: project.teamSize,
      budgetMonthly: project.budgetMonthly,
      timePerWeek: project.timePerWeek,
      skillsAndChannels: project.skills,
      existingCustomerInsights: project.existingInsights,
    },
    prioritizedOption: {
      title: option.title,
      summary: option.summary,
      prioritizationRationale: option.prioritizationRationale,
      dimensions: option.statements
        .map((link) => link.statement)
        .filter((statement) => isActiveAdopted(statement))
        .map((statement) => ({
          category: statement.category,
          content: statement.content,
          evidenceStatus: statement.evidenceStatus,
          justification: statement.justification,
          uncertainty: statement.uncertainty,
        })),
    },
    validationSteps: steps.map((step) => ({
      stepId: step.id,
      title: step.title,
      validationQuestion: step.validationQuestion,
      testDesign: step.testDesign,
      description: step.description,
      channel: step.channel,
      metrics: step.metrics,
      testedAssumption: {
        id: step.assumption.id,
        category: step.assumption.category,
        segmentAspect: step.assumption.segmentAspect,
        content: step.assumption.content,
        evidenceStatus: step.assumption.evidenceStatus,
        justification: step.assumption.justification,
        uncertainty: step.assumption.uncertainty,
        validationHistory: historyByStatement.get(step.assumption.id) ?? {
          supported: 0,
          partiallySupported: 0,
          refuted: 0,
          ambiguous: 0,
        },
      },
    })),
    marketFeedbacks: feedbacks.map((feedback) => ({
      id: feedback.id,
      stepId: feedback.stepId,
      statementId: feedback.statementId,
      content: feedback.content,
    })),
    evidenceBalance,
  };

  let result;
  try {
    result = await callLLM(PHASE5_PROMPT, context, phase5ResponseSchema);
  } catch (error) {
    if (error instanceof LlmValidationError) {
      return NextResponse.json(
        {
          error:
            "Die KI-Antwort konnte nicht verarbeitet werden. Erneut versuchen — deine Rückmeldungen bleiben erhalten.",
        },
        { status: 502 }
      );
    }
    console.error("Phase 5 LLM call failed:", error);
    return NextResponse.json(
      {
        error:
          "Die Auswertung konnte nicht erstellt werden. Erneut versuchen — deine Rückmeldungen bleiben erhalten.",
      },
      { status: 502 }
    );
  }

  // The schema cannot know valid ids — every feedback must be assessed
  // exactly once and reference its own tested assumption.
  const feedbackById = new Map(feedbacks.map((feedback) => [feedback.id, feedback]));
  const idsValid =
    result.feedbackAssessments.length === feedbacks.length &&
    new Set(result.feedbackAssessments.map((entry) => entry.feedbackId)).size ===
      feedbacks.length &&
    result.feedbackAssessments.every((entry) => {
      const feedback = feedbackById.get(entry.feedbackId);
      return feedback !== undefined && feedback.statementId === entry.statementId;
    });

  if (!idsValid) {
    return NextResponse.json(
      {
        error:
          "Die KI-Antwort passte nicht zu den erfassten Rückmeldungen. Erneut versuchen — deine Rückmeldungen bleiben erhalten.",
      },
      { status: 502 }
    );
  }

  const dampenedAssessments = dampenProxyResults(
    result.feedbackAssessments,
    steps.map((step) => ({
      id: step.id,
      assumption: { id: step.assumption.id },
      metrics: step.metrics,
    })),
    feedbacks
  );

  const { updatedFeedbacks, newStatements } = await prisma.$transaction(
    async (tx) => {
      // Assessments overwrite previous ones; the user re-confirms status
      // changes afterwards (statusApplied is reset).
      for (const assessment of dampenedAssessments) {
        await tx.marketFeedback.update({
          where: { id: assessment.feedbackId },
          data: {
            result: assessment.result,
            interpretation: assessment.interpretation,
            proposedNewStatus: assessment.proposedNewStatus ?? null,
            statusApplied: false,
          },
        });
      }

      // Re-running replaces LEARNING drafts; adopted learnings are kept.
      await tx.statement.deleteMany({
        where: {
          projectId: project.id,
          phase: 5,
          category: "LEARNING",
          adopted: false,
        },
      });
      for (const statement of result.newStatements) {
        await tx.statement.create({
          data: {
            projectId: project.id,
            phase: 5,
            category: "LEARNING",
            content: statement.content,
            evidenceStatus: statement.evidenceStatus,
            origin: statement.origin,
            justification: statement.justification,
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
          where: { projectId: project.id, phase: 5, category: "LEARNING" },
          orderBy: { createdAt: "asc" },
          select: statementSelect,
        }),
      };
    }
  );

  // The adaptation is a PROPOSAL only — it is persisted as an
  // AdaptationDecision only after the user confirms it (NF3).
  const dampedIds = new Set(
    dampenedAssessments
      .filter((assessment) => assessment.proxyDamped)
      .map((assessment) => assessment.feedbackId)
  );

  return NextResponse.json(
    {
      feedbacks: updatedFeedbacks.map((feedback) => ({
        ...feedback,
        proxyDamped:
          dampedIds.has(feedback.id) || wasProxyDamped(feedback.interpretation),
      })),
      newStatements,
      adaptation: {
        decision: result.adaptation.decision,
        loopBackToPhase:
          result.adaptation.decision === "LOOP_BACK"
            ? (result.adaptation.loopBackToPhase ?? null)
            : null,
        rationale: result.adaptation.rationale,
      },
      evidenceBalance,
    },
    { status: 201 }
  );
}
