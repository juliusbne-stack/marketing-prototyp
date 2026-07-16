/**
 * Creates or replaces the deterministic Nouriva Meals demo project.
 * Run: npm run demo:seed | npm run demo:reset
 */
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import {
  DEMO_BASE_TIME,
  DEMO_PHASE4_SCREENSHOT_CURRENT_PHASE,
  DEMO_PROJECT_NAME,
  DEMO_PROJECT_SLUG,
  type DemoSeedVariant,
} from "../lib/demo/constants";
import {
  DEMO_FIXTURE,
  type FixtureStatement,
  type FixtureTask,
} from "./demo-fixture-data";

type IdMap = Record<string, string>;

function ts(minutesAfterBase = 0): Date {
  return new Date(DEMO_BASE_TIME.getTime() + minutesAfterBase * 60_000);
}

async function findDemoProjects() {
  return prisma.project.findMany({
    where: {
      OR: [
        { name: DEMO_PROJECT_NAME },
        { name: { contains: DEMO_PROJECT_SLUG, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true },
  });
}

async function deleteDemoProjects(projectIds: string[]) {
  if (projectIds.length === 0) return;
  await prisma.project.deleteMany({
    where: { id: { in: projectIds } },
  });
}

function statementData(
  fixture: FixtureStatement,
  projectId: string,
  createdAt: Date
): Prisma.StatementCreateManyInput {
  return {
    projectId,
    phase: fixture.phase,
    category: fixture.category,
    content: fixture.content,
    evidenceStatus: fixture.evidenceStatus,
    origin: fixture.origin,
    justification: fixture.justification ?? null,
    sourceRef: fixture.sourceRef ?? null,
    uncertainty: fixture.uncertainty ?? null,
    adopted: fixture.adopted ?? true,
    isCritical: fixture.isCritical ?? false,
    segmentLabel: fixture.segmentLabel ?? null,
    segmentAspect: fixture.segmentAspect ?? null,
    competitorLabel: fixture.competitorLabel ?? null,
    competitorAspect: fixture.competitorAspect ?? null,
    createdAt,
    updatedAt: createdAt,
  };
}

function resolveSeedVariant(): DemoSeedVariant {
  if (process.argv.includes("--start") || process.argv.includes("--demo-start")) {
    return "start";
  }
  if (process.argv.includes("--phase4-screenshot")) {
    return "phase4";
  }
  if (process.argv.includes("--phase5-entry")) {
    return "phase5";
  }
  return "full";
}

async function seedDemoProject(
  variant: DemoSeedVariant = "full"
): Promise<{ projectId: string; replaced: boolean; variant: DemoSeedVariant }> {
  const existing = await findDemoProjects();
  const replaced = existing.length > 0;
  await deleteDemoProjects(existing.map((p) => p.id));

  const { project: proj, adaptation } = DEMO_FIXTURE;
  const statementEntries = Object.values(DEMO_FIXTURE.statements);
  const optionEntries = Object.values(DEMO_FIXTURE.options);
  const evaluationEntries = Object.values(DEMO_FIXTURE.evaluations);
  const stepEntries = Object.values(DEMO_FIXTURE.validationSteps);
  const metricEntries = Object.values(DEMO_FIXTURE.metrics);
  const taskEntries = Object.values(DEMO_FIXTURE.tasks);
  const kpiEntries = Object.values(DEMO_FIXTURE.kpiPoints);
  const feedbackEntries = Object.values(DEMO_FIXTURE.feedbacks);

  const projectId = await prisma.$transaction(
    async (tx) => {
    const project = await tx.project.create({
      data: {
        name: proj.name,
        currentPhase:
          variant === "start"
            ? 1
            : variant === "phase4"
              ? DEMO_PHASE4_SCREENSHOT_CURRENT_PHASE
              : proj.currentPhase,
        businessIdea: proj.businessIdea,
        productStatus: proj.productStatus,
        assumedTarget: proj.assumedTarget,
        assumedProblem: proj.assumedProblem,
        valuePropDraft: proj.valuePropDraft,
        revenueIdea: proj.revenueIdea,
        region: proj.region,
        teamSize: proj.teamSize,
        budgetMonthly: proj.budgetMonthly,
        timePerWeek: proj.timePerWeek,
        skills: proj.skills,
        existingInsights: proj.existingInsights,
        profileOnboardingComplete: proj.profileOnboardingComplete,
        profileOnboardingStep: proj.profileOnboardingStep,
        // Start: noch keine Analyse — PESTEL-Relevanz kommt erst mit der Fake-KI.
        pestelRelevance: variant === "start" ? undefined : proj.pestelRelevance,
        createdAt: ts(0),
        updatedAt: ts(0),
      },
    });

    const phase2InputEntries = Object.entries(proj.phase2Inputs).map(
      ([questionKey, value], index) => ({
        projectId: project.id,
        phase: 2,
        questionKey,
        value: value as Prisma.InputJsonValue,
        skipped: false,
        updatedAt: ts(1 + index),
      })
    );
    const phase4InputEntries = Object.entries(proj.phase4Inputs).map(
      ([questionKey, value], index) => ({
        projectId: project.id,
        phase: 4,
        questionKey,
        value: value as Prisma.InputJsonValue,
        skipped: false,
        updatedAt: ts(10 + index),
      })
    );
    await tx.phaseInput.createMany({
      data: [...phase2InputEntries, ...phase4InputEntries],
    });

    // Live-Demo: nur Profil + Phase-Inputs. Artefakte entstehen über Fake-KI.
    if (variant === "start") {
      return project.id;
    }

    const statementIds: IdMap = {};
    let minute = 20;
    const phase1Fixtures = statementEntries.filter((f) => f.phase === 1);
    const phase1Created = await tx.statement.createManyAndReturn({
      data: phase1Fixtures.map((fixture, index) =>
        statementData(fixture, project.id, ts(minute + index))
      ),
    });
    phase1Fixtures.forEach((fixture, index) => {
      statementIds[fixture.key] = phase1Created[index]!.id;
    });
    minute += phase1Fixtures.length;

    const optionIds: IdMap = {};
    let optionMinute = 200;
    for (const fixture of optionEntries) {
      const created = await tx.strategyOption.create({
        data: {
          projectId: project.id,
          title: fixture.title,
          summary: fixture.summary,
          status: fixture.status,
          prioritizationRationale: fixture.prioritizationRationale ?? null,
          diversityNote: fixture.diversityNote ?? null,
          modeNote: fixture.modeNote ?? null,
          createdAt: ts(optionMinute++),
          updatedAt: ts(optionMinute),
        },
      });
      optionIds[fixture.key] = created.id;
    }

    const phase2Fixtures = statementEntries.filter((f) => f.phase === 2);
    const phase2Created = await tx.statement.createManyAndReturn({
      data: phase2Fixtures.map((fixture, index) =>
        statementData(fixture, project.id, ts(minute + index))
      ),
    });
    phase2Fixtures.forEach((fixture, index) => {
      statementIds[fixture.key] = phase2Created[index]!.id;
    });
    minute += phase2Fixtures.length;

    const optionLinkData: Prisma.OptionStatementCreateManyInput[] = [];
    for (const fixture of optionEntries) {
      const optionId = optionIds[fixture.key];
      for (const statementKey of fixture.statementKeys) {
        const statementId = statementIds[statementKey];
        if (!optionId || !statementId) {
          throw new Error(
            `Missing option/statement link: ${fixture.key} -> ${statementKey}`
          );
        }
        optionLinkData.push({ optionId, statementId });
      }
    }
    await tx.optionStatement.createMany({ data: optionLinkData });

    await tx.evaluation.createMany({
      data: evaluationEntries.map((evaluation, index) => ({
        optionId: optionIds[evaluation.optionKey],
        criterion: evaluation.criterion,
        score: evaluation.score,
        rationale: evaluation.rationale,
        createdAt: ts(300 + index),
      })),
    });

    const stepIds: IdMap = {};
    let stepMinute = 400;
    for (const fixture of stepEntries) {
      const created = await tx.validationStep.create({
        data: {
          projectId: project.id,
          optionId: optionIds[fixture.optionKey],
          assumptionId: statementIds[fixture.assumptionKey],
          title: fixture.title,
          description: fixture.description,
          validationQuestion: fixture.validationQuestion ?? null,
          testDesign: fixture.testDesign ?? null,
          marketingActivities: fixture.marketingActivities ?? undefined,
          channel: fixture.channel ?? null,
          timeframe: fixture.timeframe ?? null,
          budgetFrame: fixture.budgetFrame ?? null,
          stepType: fixture.stepType,
          strategyDimension: fixture.strategyDimension ?? null,
          testSubject: fixture.testSubject ?? null,
          adopted: fixture.adopted ?? true,
          laufmodus: fixture.laufmodus ?? "EIGENSTAENDIG",
          createdAt: ts(stepMinute++),
        },
      });
      stepIds[fixture.key] = created.id;
    }

    for (const fixture of stepEntries) {
      if (!fixture.basiertAufUmsetzungKey) continue;
      const stepId = stepIds[fixture.key];
      const baseId = stepIds[fixture.basiertAufUmsetzungKey];
      if (!stepId || !baseId) continue;
      await tx.validationStep.update({
        where: { id: stepId },
        data: { basiertAufUmsetzungId: baseId },
      });
    }

    const metricIds: IdMap = {};
    let metricMinute = 500;
    for (const fixture of metricEntries) {
      const created = await tx.metric.create({
        data: {
          stepId: stepIds[fixture.stepKey],
          name: fixture.name,
          evaluationMode: fixture.evaluationMode,
          valueType: fixture.valueType ?? null,
          aggregationStrategy: fixture.aggregationStrategy ?? null,
          evaluationConfig:
            (fixture.evaluationConfig as Prisma.InputJsonValue | undefined) ??
            undefined,
          numeratorLabel: fixture.numeratorLabel ?? null,
          denominatorLabel: fixture.denominatorLabel ?? null,
          observationUnit: fixture.observationUnit ?? null,
          metricRole: fixture.metricRole,
          signalCategory: fixture.signalCategory ?? null,
          proxyStrength: fixture.proxyStrength ?? null,
          signalRationale: fixture.signalRationale ?? null,
          successCriterion: fixture.successCriterion,
          failureCriterion: fixture.failureCriterion,
        },
      });
      metricIds[fixture.key] = created.id;
      metricMinute++;
    }

    const taskElaborationKey = "step2_task_2";
    for (const fixture of taskEntries) {
      const elaboration: FixtureTask["elaboration"] | undefined =
        fixture.elaboration;
      const elaborationJson = elaboration
        ? ({
            ...elaboration,
            targeting: elaboration.targeting.vorhanden
              ? {
                  ...elaboration.targeting,
                  basiertAufAussageIds: elaboration.targeting.basiertAufAussageIds.map(
                    (key) => statementIds[key] ?? key
                  ),
                }
              : elaboration.targeting,
          } as Prisma.InputJsonValue)
        : undefined;

      await tx.task.create({
        data: {
          stepId: stepIds[fixture.stepKey],
          title: fixture.title,
          hint: fixture.hint ?? null,
          sortOrder: fixture.sortOrder,
          done: fixture.done ?? false,
          annahmenBezugId: fixture.annahmenBezugKey
            ? statementIds[fixture.annahmenBezugKey] ?? null
            : null,
          erfolgskriterium: fixture.erfolgskriterium ?? null,
          herkunft: fixture.herkunft ?? "NEU",
          elaboration: elaborationJson,
          elaborationGeneratedAt:
            fixture.key === taskElaborationKey ? ts(550) : null,
          elaborationModel:
            fixture.key === taskElaborationKey ? "demo-fixture" : null,
        },
      });
    }

    let kpiMinute = 600;
    for (const fixture of kpiEntries) {
      await tx.kpiDataPoint.create({
        data: {
          metricId: metricIds[fixture.metricKey],
          periodLabel: fixture.periodLabel,
          value: fixture.value ?? null,
          numerator: fixture.numerator ?? null,
          denominator: fixture.denominator ?? null,
          assessment: fixture.assessment,
          createdAt: ts(kpiMinute++),
        },
      });
    }

    if (variant === "full") {
      let feedbackMinute = 700;
      for (const fixture of feedbackEntries) {
        await tx.marketFeedback.create({
          data: {
            projectId: project.id,
            stepId: stepIds[fixture.stepKey],
            statementId: statementIds[fixture.statementKey],
            content: fixture.content,
            result: fixture.result,
            interpretation: fixture.interpretation ?? null,
            proposedNewStatus: fixture.proposedNewStatus ?? null,
            statusApplied: fixture.statusApplied ?? false,
            createdAt: ts(feedbackMinute++),
          },
        });
      }

      for (const fixture of feedbackEntries) {
        if (!fixture.statusApplied || !fixture.proposedNewStatus) continue;
        const statementId = statementIds[fixture.statementKey];
        if (!statementId) continue;
        await tx.statement.update({
          where: { id: statementId },
          data: { evidenceStatus: fixture.proposedNewStatus },
        });
      }

      const phase5Fixtures = statementEntries.filter((f) => f.phase === 5);
      const phase5Created = await tx.statement.createManyAndReturn({
        data: phase5Fixtures.map((fixture, index) =>
          statementData(fixture, project.id, ts(minute + index))
        ),
      });
      phase5Fixtures.forEach((fixture, index) => {
        statementIds[fixture.key] = phase5Created[index]!.id;
      });

      await tx.adaptationDecision.create({
        data: {
          projectId: project.id,
          optionId: optionIds[adaptation.optionKey],
          decision: adaptation.decision,
          rationale: adaptation.rationale,
          loopBackToPhase: adaptation.loopBackToPhase ?? null,
          userConfirmed: adaptation.userConfirmed,
          createdAt: ts(800),
        },
      });
    }

    return project.id;
  },
    { maxWait: 60_000, timeout: 300_000 }
  );

  return { projectId, replaced, variant };
}

async function main() {
  const variant = resolveSeedVariant();
  const { projectId, replaced } = await seedDemoProject(variant);
  console.log(
    replaced
      ? `Replaced Nouriva demo project: ${projectId}`
      : `Created Nouriva demo project: ${projectId}`
  );
  console.log(`DEMO_SEED_VARIANT=${variant}`);
  console.log(`DEMO_PROJECT_ID=${projectId}`);
  if (variant === "start") {
    console.log(
      `Open: /project/${projectId}/phase/1 — Startpunkt; Phasen noch offen, KI liefert Demo-Fixtures`
    );
  }
  if (variant === "phase4") {
    console.log(
      `Open: /project/${projectId}/phase/4 — Offene Validierung mit 3 kritischen Annahmen`
    );
  }
  if (variant === "phase5") {
    console.log(
      `Open: /project/${projectId}/phase/5 — Marktrückmeldungen noch nicht erfasst`
    );
    console.log(`Cockpit: /project/${projectId}/cockpit`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
