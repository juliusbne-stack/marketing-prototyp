import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { callLLM, LlmValidationError } from "@/lib/openai";
import { PHASE4_PROMPT } from "@/lib/prompts/phase4";
import { phase4ResponseSchema } from "@/lib/schemas/phase4";

const requestSchema = z.object({
  projectId: z.string().min(1),
});

const stepInclude = {
  metrics: {
    select: {
      id: true,
      name: true,
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

  // Phase 4 works exclusively on the prioritized option (M5).
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
              segmentLabel: true,
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
          "Es gibt noch keine priorisierte Option. Priorisiere zuerst in Phase 3 eine Option.",
      },
      { status: 400 }
    );
  }

  // Context rule: profile + ONLY adopted statements (option dimensions +
  // phase 1 analysis). Statement ids are passed so the AI can reference them.
  const adoptedAnalysis = await prisma.statement.findMany({
    where: { projectId: project.id, phase: 1, adopted: true },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      category: true,
      content: true,
      evidenceStatus: true,
      origin: true,
      justification: true,
      sourceRef: true,
      uncertainty: true,
      segmentLabel: true,
      segmentAspect: true,
    },
  });

  const adoptedDimensions = option.statements
    .map((link) => link.statement)
    .filter((statement) => statement.adopted);

  // Full profile of the segment addressed by the prioritized option (single
  // source in phase 1) — critical assumptions should preferably come from its
  // weakly supported aspects.
  const addressedSegmentLabel =
    adoptedDimensions.find(
      (statement) => statement.category === "OPT_TARGET_GROUP"
    )?.segmentLabel ?? null;
  const addressedSegmentProfile = addressedSegmentLabel
    ? {
        segmentLabel: addressedSegmentLabel,
        aspects: adoptedAnalysis
          .filter(
            (statement) =>
              statement.category === "TARGET_SEGMENT" &&
              statement.segmentLabel === addressedSegmentLabel
          )
          .map((statement) => ({
            statementId: statement.id,
            segmentAspect: statement.segmentAspect,
            content: statement.content,
            evidenceStatus: statement.evidenceStatus,
            uncertainty: statement.uncertainty,
          })),
      }
    : null;

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
      dimensions: adoptedDimensions.map((statement) => ({
        id: statement.id,
        category: statement.category,
        content: statement.content,
        evidenceStatus: statement.evidenceStatus,
        origin: statement.origin,
        justification: statement.justification,
        uncertainty: statement.uncertainty,
      })),
    },
    addressedSegmentProfile,
    adoptedAnalysisStatements: adoptedAnalysis,
  };

  let result;
  try {
    result = await callLLM(PHASE4_PROMPT, context, phase4ResponseSchema);
  } catch (error) {
    if (error instanceof LlmValidationError) {
      return NextResponse.json(
        {
          error:
            "Die KI-Antwort konnte nicht verarbeitet werden. Erneut versuchen — deine Priorisierung bleibt erhalten.",
        },
        { status: 502 }
      );
    }
    console.error("Phase 4 LLM call failed:", error);
    return NextResponse.json(
      {
        error:
          "Die Umsetzungsschritte konnten nicht abgeleitet werden. Erneut versuchen — deine Priorisierung bleibt erhalten.",
      },
      { status: 502 }
    );
  }

  // The schema cannot know valid statement ids — verify them explicitly.
  const knownIds = new Set([
    ...adoptedDimensions.map((statement) => statement.id),
    ...adoptedAnalysis.map((statement) => statement.id),
  ]);
  if (!result.criticalAssumptions.every((id) => knownIds.has(id))) {
    return NextResponse.json(
      {
        error:
          "Die KI-Antwort passte nicht zu den vorhandenen Aussagen. Erneut versuchen — deine Priorisierung bleibt erhalten.",
      },
      { status: 502 }
    );
  }

  // Re-running replaces draft steps; adopted steps are never touched.
  const steps = await prisma.$transaction(async (tx) => {
    await tx.validationStep.deleteMany({
      where: { optionId: option.id, adopted: false },
    });

    // Mark the new critical assumptions; unmark statements that are no longer
    // critical and have no remaining (adopted) step.
    const remainingSteps = await tx.validationStep.findMany({
      where: { optionId: option.id },
      select: { assumptionId: true },
    });
    const keepCritical = new Set([
      ...result.criticalAssumptions,
      ...remainingSteps.map((step) => step.assumptionId),
    ]);
    await tx.statement.updateMany({
      where: {
        projectId: project.id,
        isCritical: true,
        id: { notIn: [...keepCritical] },
      },
      data: { isCritical: false },
    });
    await tx.statement.updateMany({
      where: { id: { in: result.criticalAssumptions } },
      data: { isCritical: true },
    });

    // Skip assumptions that already have an adopted step — they stay untouched.
    const adoptedAssumptionIds = new Set(
      remainingSteps.map((step) => step.assumptionId)
    );

    // AI drafts: steps with adopted=false (rule 3).
    for (const step of result.steps) {
      if (adoptedAssumptionIds.has(step.assumptionId)) continue;
      await tx.validationStep.create({
        data: {
          projectId: project.id,
          optionId: option.id,
          assumptionId: step.assumptionId,
          title: step.title,
          description: step.description,
          channel: step.channel ?? null,
          timeframe: step.timeframe,
          budgetFrame: step.budgetFrame,
          adopted: false,
          metrics: {
            create: step.metrics.map((metric) => ({
              name: metric.name,
              successCriterion: metric.successCriterion,
              failureCriterion: metric.failureCriterion,
            })),
          },
        },
      });
    }

    return tx.validationStep.findMany({
      where: { optionId: option.id },
      orderBy: { createdAt: "asc" },
      include: stepInclude,
    });
  });

  return NextResponse.json({ steps }, { status: 201 });
}
