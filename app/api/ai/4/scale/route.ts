import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { callLLM, LlmValidationError } from "@/lib/openai";
import { PHASE4_SCALE_PROMPT } from "@/lib/prompts/phase4Scale";
import { phase4ScaleResponseSchema } from "@/lib/schemas/phase4";

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

// Continuation mode (confirmed CONTINUE decision): derive 2–4 limited scaling
// steps that expand the execution while monitoring whether the supported core
// assumptions also hold at larger scale. No new validation experiments, no
// changes to the option's dimensions.
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

  // Scaling is only available after a confirmed CONTINUE decision.
  const latestAdaptation = await prisma.adaptationDecision.findFirst({
    where: { projectId: project.id, userConfirmed: true },
    orderBy: { createdAt: "desc" },
    select: { decision: true },
  });

  if (latestAdaptation?.decision !== "CONTINUE") {
    return NextResponse.json(
      {
        error:
          "Skalierungsschritte sind erst nach einer bestätigten Fortführungsentscheidung in Phase 5 verfügbar.",
      },
      { status: 400 }
    );
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

  // Only adopted steps took part in the learning loop — their assessed
  // feedback tells which critical assumptions are supported so far.
  const adoptedSteps = await prisma.validationStep.findMany({
    where: { optionId: option.id, adopted: true },
    orderBy: { createdAt: "asc" },
    include: {
      metrics: {
        select: { name: true, successCriterion: true, failureCriterion: true },
      },
      assumption: {
        select: {
          id: true,
          content: true,
          evidenceStatus: true,
          justification: true,
          uncertainty: true,
        },
      },
    },
  });

  const feedbacks = await prisma.marketFeedback.findMany({
    where: { stepId: { in: adoptedSteps.map((step) => step.id) } },
    orderBy: { createdAt: "asc" },
    select: {
      stepId: true,
      statementId: true,
      result: true,
      interpretation: true,
    },
  });

  const assessedFeedbacks = feedbacks.filter(
    (feedback) => feedback.interpretation !== null
  );

  // Supported core assumptions incl. the steps/channels that tested them.
  const supportedAssumptionIds = new Set(
    assessedFeedbacks
      .filter((feedback) => feedback.result === "SUPPORTED")
      .map((feedback) => feedback.statementId)
  );
  const supportedCriticalAssumptions = [...supportedAssumptionIds].map(
    (assumptionId) => {
      const testingSteps = adoptedSteps.filter(
        (step) => step.assumptionId === assumptionId
      );
      const assumption = testingSteps[0].assumption;
      return {
        id: assumption.id,
        content: assumption.content,
        evidenceStatus: assumption.evidenceStatus,
        justification: assumption.justification,
        testedWith: testingSteps.map((step) => ({
          title: step.title,
          channel: step.channel,
          metrics: step.metrics,
          feedbackResults: assessedFeedbacks
            .filter((feedback) => feedback.stepId === step.id)
            .map((feedback) => ({
              result: feedback.result,
              interpretation: feedback.interpretation,
            })),
        })),
      };
    }
  );

  if (supportedCriticalAssumptions.length === 0) {
    return NextResponse.json(
      {
        error:
          "Es gibt noch keine gestützte kritische Annahme. Skalierungsschritte setzen mindestens eine als gestützt bewertete Annahme aus Phase 5 voraus.",
      },
      { status: 400 }
    );
  }

  // Evidence balance of the option — same numbers phase 5 anchored the
  // CONTINUE proposal on (dimension counts + assessment results + run number).
  const dimensions = option.statements
    .map((link) => link.statement)
    .filter((statement) => statement.adopted);
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

  // Context rule: profile + prioritized option (adopted dimensions with
  // evidence status) + supported assumptions with their tested steps/channels
  // + evidence balance.
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
      dimensions: dimensions.map((statement) => ({
        category: statement.category,
        content: statement.content,
        evidenceStatus: statement.evidenceStatus,
        justification: statement.justification,
        uncertainty: statement.uncertainty,
      })),
    },
    supportedCriticalAssumptions,
    evidenceBalance,
  };

  let result;
  try {
    result = await callLLM(
      PHASE4_SCALE_PROMPT,
      context,
      phase4ScaleResponseSchema
    );
  } catch (error) {
    if (error instanceof LlmValidationError) {
      return NextResponse.json(
        {
          error:
            "Die KI-Antwort konnte nicht verarbeitet werden. Erneut versuchen — deine Fortführungsentscheidung bleibt erhalten.",
        },
        { status: 502 }
      );
    }
    console.error("Phase 4 scale LLM call failed:", error);
    return NextResponse.json(
      {
        error:
          "Die Skalierungsschritte konnten nicht abgeleitet werden. Erneut versuchen — deine Fortführungsentscheidung bleibt erhalten.",
      },
      { status: 502 }
    );
  }

  // The schema cannot know valid ids — every referenced assumption must be
  // one of the supported core assumptions.
  const referencedIds = [
    ...result.criticalAssumptions,
    ...result.steps.map((step) => step.assumptionId),
  ];
  if (!referencedIds.every((id) => supportedAssumptionIds.has(id))) {
    return NextResponse.json(
      {
        error:
          "Die KI-Antwort passte nicht zu den gestützten Annahmen. Erneut versuchen — deine Fortführungsentscheidung bleibt erhalten.",
      },
      { status: 502 }
    );
  }

  // Re-running replaces draft steps; adopted steps (incl. the completed
  // validation steps) are never touched. The referenced assumptions are
  // already marked critical — isCritical stays as it is.
  let steps;
  try {
    steps = await prisma.$transaction(async (tx) => {
      await tx.validationStep.deleteMany({
        where: { optionId: option.id, adopted: false },
      });

      // AI drafts: scaling steps with adopted=false (rule 3) — they go through
      // the normal adoption, refinement and phase 5 mechanics.
      for (const step of result.steps) {
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
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientValidationError &&
      /timeframe|budgetFrame/.test(error.message)
    ) {
      console.error(
        "Phase 4 scale persistence failed (stale Prisma client):",
        error
      );
      return NextResponse.json(
        {
          error:
            "Der Datenbank-Client ist veraltet. Bitte den Entwicklungsserver stoppen, „npx prisma generate“ ausführen und den Server neu starten — dann erneut versuchen.",
        },
        { status: 503 }
      );
    }
    console.error("Phase 4 scale persistence failed:", error);
    return NextResponse.json(
      {
        error:
          "Die Skalierungsschritte konnten nicht gespeichert werden. Erneut versuchen — deine Fortführungsentscheidung bleibt erhalten.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ steps }, { status: 201 });
}
