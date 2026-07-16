import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { phase4RefineValidationResponseSchema } from "@/lib/schemas/phase4RefineValidation";
import { validationStepHasDependents } from "@/lib/validationStep";

const stepSelect = {
  id: true,
  projectId: true,
  optionId: true,
  assumptionId: true,
  title: true,
  description: true,
  validationQuestion: true,
  testDesign: true,
  marketingActivities: true,
  channel: true,
  timeframe: true,
  budgetFrame: true,
  adopted: true,
  discardedAt: true,
  metrics: {
    select: {
      id: true,
      name: true,
      evaluationMode: true,
      metricRole: true,
      successCriterion: true,
      failureCriterion: true,
    },
  },
} as const;

const requestSchema = z.object({
  stepId: z.string().min(1),
  proposal: phase4RefineValidationResponseSchema,
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Schritt oder Überarbeitungsvorschlag fehlt in der Anfrage." },
      { status: 400 }
    );
  }

  const { stepId, proposal } = parsed.data;
  const { revisedStatement, revisedValidationStep, revisedMetrics } = proposal;

  const existing = await prisma.validationStep.findUnique({
    where: { id: stepId },
    include: {
      tasks: { select: { id: true } },
      feedbacks: { select: { id: true } },
      metrics: { select: { dataPoints: { select: { id: true } } } },
    },
  });

  if (!existing || existing.discardedAt) {
    return NextResponse.json(
      { error: "Der Umsetzungsschritt wurde nicht gefunden." },
      { status: 404 }
    );
  }

  const hasDependents = validationStepHasDependents(existing);
  const requiresReplacement = existing.adopted && hasDependents;

  const statementUpdate = {
    content: revisedStatement.content,
    evidenceStatus: revisedStatement.evidenceStatus,
    justification: revisedStatement.justification,
    uncertainty: revisedStatement.uncertainty,
  };

  const stepPayload = {
    title: revisedValidationStep.title,
    description: revisedValidationStep.description,
    validationQuestion: revisedValidationStep.validationQuestion,
    testDesign: revisedValidationStep.testDesign,
    marketingActivities: revisedValidationStep.marketingActivities,
    channel: revisedValidationStep.channel ?? null,
    timeframe: revisedValidationStep.timeframe,
    budgetFrame: revisedValidationStep.budgetFrame,
    metrics: {
      deleteMany: {},
      create: revisedMetrics.map((metric) => ({
        name: metric.name,
        evaluationMode: metric.evaluationMode,
        valueType: metric.valueType ?? null,
        aggregationStrategy: metric.aggregationStrategy ?? null,
        evaluationConfig: metric.evaluationConfig ?? undefined,
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
  };

  const assumptionSelect = {
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
    competitorLabel: true,
    competitorAspect: true,
  } as const;

  try {
    if (requiresReplacement) {
      // Adopted steps with tasks, KPIs or feedback must not be overwritten —
      // archive the old step and create a new draft the user can re-adopt.
      const result = await prisma.$transaction(async (tx) => {
        await tx.validationStep.update({
          where: { id: existing.id },
          data: { discardedAt: new Date() },
        });
        await tx.statement.update({
          where: { id: existing.assumptionId },
          data: statementUpdate,
        });
        const newStep = await tx.validationStep.create({
          data: {
            projectId: existing.projectId,
            optionId: existing.optionId,
            assumptionId: existing.assumptionId,
            adopted: false,
            ...stepPayload,
          },
          select: stepSelect,
        });
        const assumption = await tx.statement.findUniqueOrThrow({
          where: { id: existing.assumptionId },
          select: assumptionSelect,
        });
        return { step: newStep, assumption, archivedStepId: existing.id };
      });
      return NextResponse.json({
        ...result,
        replaced: true,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.statement.update({
        where: { id: existing.assumptionId },
        data: statementUpdate,
      });
      const step = await tx.validationStep.update({
        where: { id: existing.id },
        data: stepPayload,
        select: stepSelect,
      });
      const assumption = await tx.statement.findUniqueOrThrow({
        where: { id: existing.assumptionId },
        select: assumptionSelect,
      });
      return { step, assumption, archivedStepId: null as string | null };
    });

    return NextResponse.json({
      ...result,
      replaced: false,
    });
  } catch (error) {
    console.error("Adopt refinement failed:", error);
    return NextResponse.json(
      { error: "Die Überarbeitung konnte nicht übernommen werden. Erneut versuchen." },
      { status: 500 }
    );
  }
}
