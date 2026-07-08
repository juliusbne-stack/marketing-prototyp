import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { callLLM, LlmValidationError } from "@/lib/openai";
import {
  countAdoptedCompetitorLabels,
  pickRandomTargetCompetitorCount,
  requiredNewCompetitorProfiles,
} from "@/lib/competitorCount";
import { buildPhase1Prompt } from "@/lib/prompts/phase1";
import { buildPhase1IncrementalPrompt } from "@/lib/prompts/phase1Incremental";
import {
  createPhase1IncrementalResponseSchema,
  createPhase1ResponseSchema,
  type Phase1Statement,
} from "@/lib/schemas/phase1";
import { filterDuplicateStatements } from "@/lib/statementDedup";

/** Phase 1 can return 100+ statements — allow long runs locally and on Vercel. */
export const maxDuration = 300;

/** Large JSON output for many competitor profiles (9–17 actors × 6 aspects). */
const PHASE1_MAX_TOKENS = 16_384;

const requestSchema = z.object({
  projectId: z.string().min(1),
});

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
  competitorLabel: true,
  competitorAspect: true,
} satisfies Prisma.StatementSelect;

const adoptedContextSelect = {
  category: true,
  content: true,
  evidenceStatus: true,
  origin: true,
  justification: true,
  sourceRef: true,
  uncertainty: true,
  segmentLabel: true,
  segmentAspect: true,
  competitorLabel: true,
  competitorAspect: true,
} satisfies Prisma.StatementSelect;

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

  if (!project.businessIdea?.trim()) {
    return NextResponse.json(
      { error: "Bitte zuerst das Start-up-Profil speichern — die Geschäftsidee ist Pflicht." },
      { status: 400 }
    );
  }

  const adoptedAnalysis = await prisma.statement.findMany({
    where: { projectId: project.id, phase: 1, adopted: true },
    orderBy: { createdAt: "asc" },
    select: adoptedContextSelect,
  });

  const isIncremental = adoptedAnalysis.length > 0;

  // Per-run random actor target (9–17); passed to prompt and Zod validation.
  const targetCompetitorCount = pickRandomTargetCompetitorCount();
  const adoptedCompetitorLabelCount =
    countAdoptedCompetitorLabels(adoptedAnalysis);
  const requiredNewProfiles = requiredNewCompetitorProfiles(
    targetCompetitorCount,
    adoptedCompetitorLabelCount
  );

  const context = {
    targetCompetitorCount,
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
    ...(isIncremental ? { adoptedAnalysisStatements: adoptedAnalysis } : {}),
  };

  const phasePrompt = isIncremental
    ? `${buildPhase1Prompt(targetCompetitorCount)}\n\n${buildPhase1IncrementalPrompt({
        targetCompetitorCount,
        adoptedCompetitorLabelCount,
        requiredNewProfiles,
      })}`
    : buildPhase1Prompt(targetCompetitorCount);

  const responseSchema = isIncremental
    ? createPhase1IncrementalResponseSchema(adoptedAnalysis, {
        targetCompetitorCount,
        requiredNewProfiles,
      })
    : createPhase1ResponseSchema(targetCompetitorCount);

  let result;
  try {
    result = await callLLM(phasePrompt, context, responseSchema, {
      maxTokens: PHASE1_MAX_TOKENS,
      validationRetries: 2,
      retryPreamble: [
        `PFLICHT-CHECK WETTBEWERB (targetCompetitorCount=${targetCompetitorCount} im Projektkontext):`,
        `- GENAU ${targetCompetitorCount} verschiedene competitorLabels`,
        `- Je Label GENAU 6 COMPETITOR-Statements (alle competitorAspect-Werte)`,
        `- ZUSÄTZLICH 1–3 COMPETITOR-Landschafts-Aussagen OHNE competitorLabel`,
        "- COMPETITOR-Bereich nicht kürzen — auch wenn andere Bereiche schon vollständig sind",
      ].join("\n"),
    });
  } catch (error) {
    if (error instanceof LlmValidationError) {
      console.error("Phase 1 LLM validation failed:", error.message);
      return NextResponse.json(
        {
          error:
            "Die KI-Antwort konnte nicht verarbeitet werden. Erneut versuchen — deine Eingaben bleiben erhalten.",
          ...(process.env.NODE_ENV === "development"
            ? { details: error.message }
            : {}),
        },
        { status: 502 }
      );
    }
    console.error("Phase 1 LLM call failed:", error);
    return NextResponse.json(
      {
        error:
          "Die Analyse konnte nicht erstellt werden. Erneut versuchen — deine Eingaben bleiben erhalten.",
      },
      { status: 502 }
    );
  }

  const { kept: newStatements, filtered: filteredDuplicates } =
    filterDuplicateStatements<Phase1Statement>(result.statements, adoptedAnalysis);

  // Re-running the analysis replaces drafts that were not adopted yet;
  // adopted statements (the project state) are never touched.
  const { statements, pestelRelevance } = await prisma.$transaction(async (tx) => {
    await tx.statement.deleteMany({
      where: { projectId: project.id, phase: 1, adopted: false },
    });
    if (newStatements.length > 0) {
      await tx.statement.createMany({
        data: newStatements.map((statement) => ({
          projectId: project.id,
          phase: 1,
          category: statement.category,
          content: statement.content,
          evidenceStatus: statement.evidenceStatus,
          origin: statement.origin,
          justification: statement.justification,
          sourceRef: statement.sourceRef ?? null,
          uncertainty: statement.uncertainty ?? null,
          segmentLabel: statement.segmentLabel ?? null,
          segmentAspect: statement.segmentAspect ?? null,
          competitorLabel: statement.competitorLabel ?? null,
          competitorAspect: statement.competitorAspect ?? null,
          adopted: false,
        })),
      });
    }
    await tx.project.update({
      where: { id: project.id },
      data: {
        pestelRelevance: result.pestelRelevance as Prisma.InputJsonValue,
      },
    });
    const savedStatements = await tx.statement.findMany({
      where: { projectId: project.id, phase: 1 },
      orderBy: { createdAt: "asc" },
      select: statementSelect,
    });
    return {
      statements: savedStatements,
      pestelRelevance: result.pestelRelevance,
    };
  });

  return NextResponse.json(
    {
      statements,
      pestelRelevance,
      incremental: isIncremental,
      filteredDuplicateCount: filteredDuplicates.length,
    },
    { status: 201 }
  );
}
