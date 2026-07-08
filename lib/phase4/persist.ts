import type { StepType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ProcessedStep } from "./guards";

export const phase4StepInclude = {
  metrics: {
    select: {
      id: true,
      name: true,
      evaluationMode: true,
      metricRole: true,
      signalCategory: true,
      successCriterion: true,
      failureCriterion: true,
    },
  },
  assumption: {
    select: {
      id: true,
      projectId: true,
      phase: true,
      category: true,
      segmentAspect: true,
      content: true,
      evidenceStatus: true,
      origin: true,
      justification: true,
      sourceRef: true,
      uncertainty: true,
      isCritical: true,
      adopted: true,
    },
  },
} as const;

export async function persistPhase4Steps({
  projectId,
  optionId,
  stepType,
  processedSteps,
  criticalAssumptionIds,
}: {
  projectId: string;
  optionId: string;
  stepType: StepType;
  processedSteps: ProcessedStep[];
  criticalAssumptionIds: string[];
}) {
  return prisma.$transaction(async (tx) => {
    await tx.validationStep.deleteMany({
      where: { optionId, adopted: false },
    });

    const remainingSteps = await tx.validationStep.findMany({
      where: { optionId },
      select: { assumptionId: true },
    });
    const keepCritical = new Set([
      ...criticalAssumptionIds,
      ...remainingSteps.map((step) => step.assumptionId),
    ]);
    await tx.statement.updateMany({
      where: {
        projectId,
        isCritical: true,
        id: { notIn: [...keepCritical] },
      },
      data: { isCritical: false },
    });
    await tx.statement.updateMany({
      where: { id: { in: criticalAssumptionIds } },
      data: { isCritical: true },
    });

    const adoptedAssumptionIds = new Set(
      remainingSteps.map((step) => step.assumptionId)
    );

    for (const step of processedSteps) {
      if (adoptedAssumptionIds.has(step.assumptionId)) continue;
      await tx.validationStep.create({
        data: {
          projectId,
          optionId,
          assumptionId: step.assumptionId,
          title: step.title,
          description: step.description,
          validationQuestion: step.validationQuestion,
          testDesign: step.testDesign,
          marketingActivities: step.marketingActivities,
          channel: step.channel ?? null,
          timeframe: step.timeframe,
          budgetFrame: step.budgetFrame,
          stepType,
          strategyDimension: step.strategyDimension,
          testSubject: step.testSubject,
          methodWarning: step.methodWarning,
          adopted: false,
          metrics: {
            create: step.metrics.map((metric) => ({
              name: metric.name,
              evaluationMode: metric.evaluationMode,
              metricRole: metric.metricRole,
              signalCategory: metric.signalCategory,
              successCriterion: metric.successCriterion,
              failureCriterion: metric.failureCriterion,
            })),
          },
        },
      });
    }

    return tx.validationStep.findMany({
      where: { optionId, discardedAt: null },
      orderBy: { createdAt: "asc" },
      include: phase4StepInclude,
    });
  });
}
