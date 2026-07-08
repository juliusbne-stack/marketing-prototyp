import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { callLLM, LlmValidationError, mapLlmCallError } from "@/lib/openai";
import {
  loadScalingTestedWith,
  loadStartupProfile,
  whitelistToContext,
} from "@/lib/phase4/context";
import {
  buildCandidateWhitelist,
  computeWhitelistSingleDimension,
  getValidatedChannels,
  processLlmResult,
} from "@/lib/phase4/guards";
import { getPhase4Mode } from "@/lib/phase4/mode";
import { phase4StepInclude, persistPhase4Steps } from "@/lib/phase4/persist";
import { EMPTY_WHITELIST_SCALING } from "@/lib/labels/phase4";
import { PHASE4_SCALE_PROMPT } from "@/lib/prompts/phase4Scale";
import { phase4ScaleResponseSchema } from "@/lib/schemas/phase4";

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

  const { projectId } = parsed.data;
  const mode = await getPhase4Mode(projectId);

  if (mode !== "SCALING") {
    return NextResponse.json(
      {
        error:
          "Skalierungsschritte sind erst nach einer bestätigten Fortführungsentscheidung in Phase 5 verfügbar.",
      },
      { status: 400 }
    );
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json(
      { error: "Das Projekt wurde nicht gefunden." },
      { status: 404 }
    );
  }

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
              evidenceStatus: true,
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

  const whitelist = await buildCandidateWhitelist(projectId, "SCALING");
  const validatedChannels = await getValidatedChannels(projectId);

  if (whitelist.length === 0) {
    console.log("[phase4/scale] Whitelist leer (SCALING) — kein LLM-Call.");
    const steps = await prisma.validationStep.findMany({
      where: { optionId: option.id, discardedAt: null },
      orderBy: { createdAt: "asc" },
      include: phase4StepInclude,
    });
    return NextResponse.json({
      steps,
      diversityNote: null,
      modeNote: null,
      emptyState: EMPTY_WHITELIST_SCALING,
    });
  }

  const testedWithByAssumption = await loadScalingTestedWith(projectId);
  const dimensions = option.statements
    .map((link) => link.statement)
    .filter((statement) => statement.adopted);

  const completedRuns = await prisma.adaptationDecision.count({
    where: { optionId: option.id, userConfirmed: true },
  });

  const supportedCriticalAssumptions = whitelist.map((candidate) => ({
    id: candidate.id,
    category: candidate.category,
    content: candidate.content,
    evidenceStatus: candidate.evidenceStatus,
    strategyDimension: candidate.strategyDimension,
    testedWith: testedWithByAssumption.get(candidate.id) ?? [],
  }));

  const context = {
    modus: "SCALING",
    whitelist: whitelistToContext(whitelist),
    validatedChannels,
    startupProfile: await loadStartupProfile(projectId),
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
    evidenceBalance: {
      dimensions: {
        total: dimensions.length,
        fact: dimensions.filter((s) => s.evidenceStatus === "FACT").length,
        assumption: dimensions.filter((s) => s.evidenceStatus === "ASSUMPTION")
          .length,
        openQuestion: dimensions.filter(
          (s) => s.evidenceStatus === "OPEN_QUESTION"
        ).length,
      },
      validationRun: completedRuns + 1,
    },
  };

  const guardCtx = {
    mode: "SCALING" as const,
    whitelist,
    validatedChannels,
    whitelistSingleDimension: computeWhitelistSingleDimension(whitelist),
  };

  let llmResult;
  try {
    llmResult = await callLLM(
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
        error: mapLlmCallError(
          error,
          "Die Skalierungsschritte konnten nicht abgeleitet werden. Erneut versuchen — deine Fortführungsentscheidung bleibt erhalten."
        ),
      },
      { status: 502 }
    );
  }

  const processed = await processLlmResult(llmResult, guardCtx);
  console.log("[phase4/scale] Guard-Log:", processed.log.join(" | "));

  let steps;
  try {
    steps = await persistPhase4Steps({
      projectId,
      optionId: option.id,
      stepType: "SCALING",
      processedSteps: processed.steps,
      criticalAssumptionIds: llmResult.criticalAssumptions.filter((id) =>
        processed.steps.some((step) => step.assumptionId === id)
      ),
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientValidationError &&
      /timeframe|budgetFrame|stepType|strategyDimension/.test(error.message)
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

  return NextResponse.json(
    {
      steps,
      diversityNote: processed.diversityNote,
      modeNote: processed.modeNote,
      emptyState: null,
    },
    { status: 201 }
  );
}
