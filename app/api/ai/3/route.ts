import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ACTIVE_ADOPTED_WHERE, isActiveAdopted } from "@/lib/statementFilters";
import { callLLM, LlmValidationError } from "@/lib/openai";
import { PHASE3_PROMPT } from "@/lib/prompts/phase3";
import { phase3ResponseSchema } from "@/lib/schemas/phase3";

const requestSchema = z.object({
  projectId: z.string().min(1),
});

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

  // Only adopted options (hypothesis bundles) are evaluated; their dimension
  // statements are adopted=true by construction (option adoption).
  const options = await prisma.strategyOption.findMany({
    where: {
      projectId: project.id,
      status: { in: ["ADOPTED", "PRIORITIZED", "DEFERRED"] },
    },
    orderBy: { createdAt: "asc" },
    include: {
      statements: {
        include: {
          statement: {
            select: {
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

  if (options.length < 2) {
    return NextResponse.json(
      {
        error:
          "Für die Bewertung müssen mindestens zwei Optionen aus Phase 2 in den Projektstand übernommen sein.",
      },
      { status: 400 }
    );
  }

  // Context rule: profile + ONLY adopted statements (phase 1 analysis + option dimensions).
  const adoptedAnalysis = await prisma.statement.findMany({
    where: { projectId: project.id, phase: 1, ...ACTIVE_ADOPTED_WHERE },
    orderBy: { createdAt: "asc" },
    select: {
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
    adoptedAnalysisStatements: adoptedAnalysis,
    strategyOptions: options.map((option) => ({
      optionId: option.id,
      title: option.title,
      summary: option.summary,
      dimensions: option.statements
        .map((link) => link.statement)
        .filter((statement) => isActiveAdopted(statement))
        .map((statement) => ({
          category: statement.category,
          content: statement.content,
          evidenceStatus: statement.evidenceStatus,
          origin: statement.origin,
          justification: statement.justification,
          uncertainty: statement.uncertainty,
        })),
    })),
  };

  let result;
  try {
    result = await callLLM(PHASE3_PROMPT, context, phase3ResponseSchema);
  } catch (error) {
    if (error instanceof LlmValidationError) {
      return NextResponse.json(
        {
          error:
            "Die KI-Antwort konnte nicht verarbeitet werden. Erneut versuchen — deine Optionen bleiben erhalten.",
        },
        { status: 502 }
      );
    }
    console.error("Phase 3 LLM call failed:", error);
    return NextResponse.json(
      {
        error:
          "Die Bewertung konnte nicht erstellt werden. Erneut versuchen — deine Optionen bleiben erhalten.",
      },
      { status: 502 }
    );
  }

  // The schema cannot know valid option ids — verify them explicitly.
  const knownIds = new Set(options.map((option) => option.id));
  const idsValid =
    result.evaluations.every((evaluation) => knownIds.has(evaluation.optionId)) &&
    result.evaluations.length === options.length &&
    new Set(result.evaluations.map((evaluation) => evaluation.optionId)).size ===
      options.length &&
    knownIds.has(result.recommendation.optionId);

  if (!idsValid) {
    return NextResponse.json(
      {
        error:
          "Die KI-Antwort passte nicht zu den vorhandenen Optionen. Erneut versuchen — deine Optionen bleiben erhalten.",
      },
      { status: 502 }
    );
  }

  // Re-running the evaluation replaces previous scores.
  const evaluations = await prisma.$transaction(async (tx) => {
    await tx.evaluation.deleteMany({
      where: { optionId: { in: options.map((option) => option.id) } },
    });
    await tx.evaluation.createMany({
      data: result.evaluations.flatMap((evaluation) =>
        evaluation.scores.map((score) => ({
          optionId: evaluation.optionId,
          criterion: score.criterion,
          score: score.score,
          rationale: score.rationale,
        }))
      ),
    });
    return tx.evaluation.findMany({
      where: { optionId: { in: options.map((option) => option.id) } },
      select: {
        id: true,
        optionId: true,
        criterion: true,
        score: true,
        rationale: true,
      },
    });
  });

  // The recommendation is a PROPOSAL only — it is not persisted as a decision.
  // The user confirms or overrides it in the PrioritizationPanel (F7/NF3).
  return NextResponse.json(
    { evaluations, recommendation: result.recommendation },
    { status: 201 }
  );
}
