import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DEMO_FIXTURE } from "@/scripts/demo-fixture-data";
import { demoDelay } from "@/lib/demo/delay";
import { phase4StepInclude, persistPhase4GenerationNotes } from "@/lib/phase4/persist";
import { DemoAiPreconditionError } from "@/lib/demo/fakeAi/phase3";

export async function serveDemoPhase4(projectId: string) {
  await demoDelay(1000);

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
            },
          },
        },
      },
    },
  });

  if (!option) {
    throw new DemoAiPreconditionError(
      "Es gibt noch keine priorisierte Option. Priorisiere zuerst in Phase 3 eine Option."
    );
  }

  const statementIdByContent = new Map(
    option.statements.map((link) => [link.statement.content, link.statement.id])
  );

  const stepEntries = Object.values(DEMO_FIXTURE.validationSteps);
  const metricEntries = Object.values(DEMO_FIXTURE.metrics);

  const criticalAssumptionIds: string[] = [];

  await prisma.$transaction(async (tx) => {
    await tx.validationStep.deleteMany({
      where: { optionId: option.id, adopted: false },
    });

    const stepIds: Record<string, string> = {};

    for (const fixture of stepEntries) {
      const assumptionFixture = DEMO_FIXTURE.statements[fixture.assumptionKey];
      const assumptionId = assumptionFixture
        ? statementIdByContent.get(assumptionFixture.content)
        : undefined;
      if (!assumptionId) {
        throw new Error(
          `Demo Phase 4: Annahme nicht gefunden (${fixture.assumptionKey})`
        );
      }
      criticalAssumptionIds.push(assumptionId);

      const metrics = metricEntries.filter((m) => m.stepKey === fixture.key);

      const created = await tx.validationStep.create({
        data: {
          projectId,
          optionId: option.id,
          assumptionId,
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
          adopted: false,
          laufmodus: fixture.laufmodus ?? "EIGENSTAENDIG",
          metrics: {
            create: metrics.map((metric) => ({
              name: metric.name,
              evaluationMode: metric.evaluationMode,
              valueType: metric.valueType ?? null,
              aggregationStrategy: metric.aggregationStrategy ?? null,
              evaluationConfig:
                (metric.evaluationConfig as Prisma.InputJsonValue | undefined) ??
                undefined,
              numeratorLabel: metric.numeratorLabel ?? null,
              denominatorLabel: metric.denominatorLabel ?? null,
              observationUnit: metric.observationUnit ?? null,
              metricRole: metric.metricRole,
              signalCategory: metric.signalCategory ?? null,
              proxyStrength: metric.proxyStrength ?? null,
              signalRationale: metric.signalRationale ?? null,
              successCriterion: metric.successCriterion,
              failureCriterion: metric.failureCriterion,
            })),
          },
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

    await tx.statement.updateMany({
      where: {
        projectId,
        isCritical: true,
        id: { notIn: criticalAssumptionIds },
      },
      data: { isCritical: false },
    });
    await tx.statement.updateMany({
      where: { id: { in: criticalAssumptionIds } },
      data: { isCritical: true },
    });
  });

  const fixtureOption = Object.values(DEMO_FIXTURE.options).find(
    (entry) => entry.title === option.title
  );
  await persistPhase4GenerationNotes({
    optionId: option.id,
    diversityNote: fixtureOption?.diversityNote ?? null,
    modeNote: fixtureOption?.modeNote ?? null,
  });

  const steps = await prisma.validationStep.findMany({
    where: { optionId: option.id, discardedAt: null },
    orderBy: { createdAt: "asc" },
    include: phase4StepInclude,
  });

  return {
    steps,
    diversityNote: fixtureOption?.diversityNote ?? null,
    modeNote: fixtureOption?.modeNote ?? null,
    emptyState: null,
  };
}
