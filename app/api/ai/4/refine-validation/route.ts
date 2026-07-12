import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ACTIVE_ADOPTED_WHERE, isActiveAdopted } from "@/lib/statementFilters";
import { callLLM, LlmValidationError, mapLlmCallError } from "@/lib/openai";
import { PHASE4_REFINE_VALIDATION_PROMPT } from "@/lib/prompts/phase4RefineValidation";
import { phase4RefineValidationResponseSchema } from "@/lib/schemas/phase4RefineValidation";
import { buildPhase4Planning, planningToLlmContext } from "@/lib/phase4/pipeline";
import { checkValidationStepConsistency } from "@/lib/phase4/consistencyCheck";
import { loadPhaseInputsForPage } from "@/lib/phaseInput/context";
import { statementCategoryToStrategyDimension } from "@/lib/phase4/strategyDimension";
import { validationStepHasDependents } from "@/lib/validationStep";

const requestSchema = z.object({
  projectId: z.string().min(1),
  statementId: z.string().min(1),
  validationStepId: z.string().min(1),
  userInstruction: z.string().trim().min(1),
  previousRefinementRounds: z
    .array(
      z.object({
        feedback: z.string().trim().min(1),
        resultTitle: z.string().trim().min(1),
      })
    )
    .default([]),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Projekt, Aussage, Schritt oder Nutzerhinweis fehlt in der Anfrage." },
      { status: 400 }
    );
  }

  const step = await prisma.validationStep.findUnique({
    where: { id: parsed.data.validationStepId },
    include: {
      project: true,
      option: {
        select: {
          title: true,
          summary: true,
          prioritizationRationale: true,
          statements: {
            include: {
              statement: {
                select: {
                  id: true,
                  category: true,
                  content: true,
                  evidenceStatus: true,
                  justification: true,
                  uncertainty: true,
                  adopted: true,
                  supersededByStatementId: true,
                },
              },
            },
          },
        },
      },
      assumption: {
        select: {
          id: true,
          category: true,
          content: true,
          evidenceStatus: true,
          justification: true,
          uncertainty: true,
        },
      },
      metrics: {
        select: {
          name: true,
          evaluationMode: true,
          successCriterion: true,
          failureCriterion: true,
        },
      },
      tasks: { select: { id: true } },
      feedbacks: { select: { id: true } },
    },
  });

  if (!step || step.discardedAt) {
    return NextResponse.json(
      { error: "Der Umsetzungsschritt wurde nicht gefunden." },
      { status: 404 }
    );
  }

  if (
    step.projectId !== parsed.data.projectId ||
    step.assumptionId !== parsed.data.statementId
  ) {
    return NextResponse.json(
      { error: "Aussage und Umsetzungsschritt passen nicht zusammen." },
      { status: 400 }
    );
  }

  const adoptedAnalysis = await prisma.statement.findMany({
    where: { projectId: step.projectId, ...ACTIVE_ADOPTED_WHERE },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      phase: true,
      category: true,
      content: true,
      evidenceStatus: true,
      justification: true,
      uncertainty: true,
    },
  });

  const adoptedDimensions = step.option.statements
    .map((link) => link.statement)
    .filter((statement) => isActiveAdopted(statement));

  const phaseInputState = await loadPhaseInputsForPage(step.projectId, 4);
  const planningBundle = buildPhase4Planning(
    [
      {
        id: step.assumption.id,
        content: step.assumption.content,
        justification: step.assumption.justification,
        uncertainty: step.assumption.uncertainty,
        evidenceStatus: step.assumption.evidenceStatus,
        strategyDimension: statementCategoryToStrategyDimension(
          step.assumption.category
        ),
        category: step.assumption.category,
        allowedDecisiveTestSubjects: [],
      },
    ],
    phaseInputState
  );
  const planningContext = planningToLlmContext(planningBundle);

  const project = step.project;
  const context = {
    ...planningContext,
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
      title: step.option.title,
      summary: step.option.summary,
      prioritizationRationale: step.option.prioritizationRationale,
      dimensions: adoptedDimensions,
    },
    adoptedStatementsFromPreviousPhases: adoptedAnalysis,
    criticalAssumption: step.assumption,
    currentStep: {
      title: step.title,
      description: step.description,
      channel: step.channel,
      timeframe: step.timeframe,
      budgetFrame: step.budgetFrame,
      adopted: step.adopted,
    },
    metrics: step.metrics,
    userInstruction: parsed.data.userInstruction,
    previousRefinementRounds: parsed.data.previousRefinementRounds,
  };

  let result;
  try {
    result = await callLLM(
      PHASE4_REFINE_VALIDATION_PROMPT,
      context,
      phase4RefineValidationResponseSchema
    );
  } catch (error) {
    if (error instanceof LlmValidationError) {
      return NextResponse.json(
        {
          error:
            "Die KI-Antwort konnte nicht verarbeitet werden. Erneut versuchen — der bisherige Entwurf bleibt erhalten.",
        },
        { status: 502 }
      );
    }
    console.error("Phase 4 refine-validation LLM call failed:", error);
    return NextResponse.json(
      {
        error: mapLlmCallError(
          error,
          "Der Überarbeitungsvorschlag konnte nicht erstellt werden. Erneut versuchen — der bisherige Entwurf bleibt erhalten."
        ),
      },
      { status: 502 }
    );
  }

  const metricsWithDataPoints = await prisma.metric.findMany({
    where: { stepId: step.id },
    select: { dataPoints: { select: { id: true } } },
  });
  const hasDependents = validationStepHasDependents({
    tasks: step.tasks,
    feedbacks: step.feedbacks,
    metrics: metricsWithDataPoints,
  });

  const planning = planningBundle.perAssumption.get(step.assumption.id);
  const consistencyIssues =
    planning && result.revisedValidationStep
      ? checkValidationStepConsistency(
          {
            assumptionId: step.assumption.id,
            strategyDimension: step.strategyDimension ?? "TARGET_GROUP",
            testSubject: planning.primaryTestSubject,
            validationQuestion:
              result.revisedValidationStep.validationQuestion,
            testDesign: result.revisedValidationStep.testDesign,
            title: result.revisedValidationStep.title,
            description: result.revisedValidationStep.description,
            marketingActivities:
              result.revisedValidationStep.marketingActivities,
            channel: result.revisedValidationStep.channel,
            timeframe: result.revisedValidationStep.timeframe,
            budgetFrame: result.revisedValidationStep.budgetFrame,
            metrics: result.revisedMetrics.map((metric) => ({
              ...metric,
              signalCategory: metric.signalCategory ?? "BEHAVIOR",
            })),
          },
          planning,
          planningBundle.constraints
        ).filter((issue) => issue.severity === "ERROR")
      : [];

  // Preview only — nothing is persisted until the user adopts the proposal.
  return NextResponse.json(
    {
      proposal: result,
      meta: {
        stepAdopted: step.adopted,
        hasDependents,
        requiresReplacement: step.adopted && hasDependents,
        consistencyIssues,
      },
    },
    { status: 200 }
  );
}
