import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { callLLM, LlmValidationError, mapLlmCallError } from "@/lib/openai";
import {
  buildAddressedSegmentProfile,
  buildVerfuegbareKanaeleContext,
  loadAdoptedAnalysis,
  loadStartupProfile,
  whitelistToContext,
} from "@/lib/phase4/context";
import {
  buildCandidateWhitelist,
  computeWhitelistDimensionState,
  processLlmResult,
} from "@/lib/phase4/guards";
import {
  buildPhase4Planning,
  planningToLlmContext,
} from "@/lib/phase4/pipeline";
import { getPhase4Mode } from "@/lib/phase4/mode";
import { phase4StepInclude, persistPhase4GenerationNotes, persistPhase4Steps } from "@/lib/phase4/persist";
import { EMPTY_WHITELIST_VALIDATION } from "@/lib/labels/phase4";
import { PHASE4_PROMPT } from "@/lib/prompts/phase4";
import { phase4ResponseSchema } from "@/lib/schemas/phase4";
import { buildPhaseInputLlmContext, loadPhaseInputsForPage } from "@/lib/phaseInput/context";
import { enrichStepsWithPhaseInputContext } from "@/lib/phaseInput/enrichPhase4";
import { isDemoProject } from "@/lib/demo/identity";
import {
  DemoAiPreconditionError,
  serveDemoPhase4,
} from "@/lib/demo/fakeAi";

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

  if (mode !== "VALIDATION") {
    return NextResponse.json(
      {
        error:
          "Neue Validierungsschritte sind im Fortführungsmodus nicht vorgesehen. Leite Skalierungsschritte ab oder wähle in Phase 5 „Anpassen (ADAPT)“, um neue Annahmen zu prüfen.",
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

  if (isDemoProject(project)) {
    try {
      const payload = await serveDemoPhase4(projectId);
      return NextResponse.json(payload, { status: 201 });
    } catch (error) {
      if (error instanceof DemoAiPreconditionError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }
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

  const whitelist = await buildCandidateWhitelist(projectId, "VALIDATION");
  if (whitelist.length === 0) {
    console.log("[phase4] Whitelist leer (VALIDATION) — kein LLM-Call.");
    const steps = await prisma.validationStep.findMany({
      where: { optionId: option.id, discardedAt: null },
      orderBy: { createdAt: "asc" },
      include: phase4StepInclude,
    });
    await persistPhase4GenerationNotes({
      optionId: option.id,
      diversityNote: null,
      modeNote: null,
    });
    return NextResponse.json({
      steps,
      diversityNote: null,
      modeNote: null,
      emptyState: EMPTY_WHITELIST_VALIDATION,
    });
  }

  const adoptedAnalysis = await loadAdoptedAnalysis(projectId);
  const addressedSegmentLabel =
    option.statements
      .map((link) => link.statement)
      .find((statement) => statement.category === "OPT_TARGET_GROUP")
      ?.segmentLabel ?? null;

  const phaseInputContext = await buildPhaseInputLlmContext(projectId, 4);
  const phaseInputState = await loadPhaseInputsForPage(projectId, 4);
  const planningBundle = buildPhase4Planning(whitelist, phaseInputState);
  const planningContext = planningToLlmContext(planningBundle);
  const verfuegbareKanaele = buildVerfuegbareKanaeleContext({
    skills: project.skills,
    businessIdea: project.businessIdea,
    phaseInputState,
    option: {
      title: option.title,
      summary: option.summary,
      prioritizationRationale: option.prioritizationRationale,
      statementTexts: option.statements.map((link) => link.statement.content),
    },
  });

  const context = {
    modus: "VALIDATION",
    whitelist: whitelistToContext(whitelist),
    validatedChannels: [],
    verfuegbareKanaele: {
      kanaele: verfuegbareKanaele.kanaele,
      vertriebskanaele: verfuegbareKanaele.vertriebskanaele,
      quellen: verfuegbareKanaele.quellen,
    },
    ...planningContext,
    startupProfile: await loadStartupProfile(projectId),
    prioritizedOption: {
      title: option.title,
      summary: option.summary,
      prioritizationRationale: option.prioritizationRationale,
    },
    addressedSegmentProfile: buildAddressedSegmentProfile(
      adoptedAnalysis,
      addressedSegmentLabel
    ),
    adoptedAnalysisStatements: adoptedAnalysis,
    ...phaseInputContext,
  };

  const guardCtx = {
    mode: "VALIDATION" as const,
    whitelist,
    validatedChannels: [],
    whitelistDimensionState: computeWhitelistDimensionState(whitelist),
    availablePlatformKeys: verfuegbareKanaele.platformKeys,
    availableChannelLabels: verfuegbareKanaele.kanaele,
    availableSalesChannels: verfuegbareKanaele.vertriebskanaele,
  };

  let llmResult;
  try {
    llmResult = await callLLM(PHASE4_PROMPT, context, phase4ResponseSchema);
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
        error: mapLlmCallError(
          error,
          "Die Umsetzungsschritte konnten nicht abgeleitet werden. Erneut versuchen — deine Priorisierung bleibt erhalten."
        ),
      },
      { status: 502 }
    );
  }

  const processed = await processLlmResult(llmResult, guardCtx, planningBundle);
  const enrichedSteps = enrichStepsWithPhaseInputContext(
    processed.steps,
    phaseInputState
  );
  console.log("[phase4] Guard-Log:", processed.log.join(" | "));

  if (enrichedSteps.length < 2) {
    return NextResponse.json(
      {
        error:
          "Es konnten nicht genügend gültige Umsetzungsschritte erzeugt werden (mindestens 2 erforderlich). Manche Annahmen wurden verworfen, weil der gewählte Prüfgegenstand nicht zur Unsicherheit passte. Erneut versuchen — deine Priorisierung bleibt erhalten.",
      },
      { status: 502 }
    );
  }

  const steps = await persistPhase4Steps({
    projectId,
    optionId: option.id,
    stepType: "VALIDATION",
    processedSteps: enrichedSteps,
    criticalAssumptionIds: llmResult.criticalAssumptions.filter((id) =>
      processed.steps.some((step) => step.assumptionId === id)
    ),
  });

  await persistPhase4GenerationNotes({
    optionId: option.id,
    diversityNote: processed.diversityNote,
    modeNote: null,
  });

  return NextResponse.json(
    {
      steps,
      diversityNote: processed.diversityNote,
      modeNote: null,
      emptyState: null,
    },
    { status: 201 }
  );
}
