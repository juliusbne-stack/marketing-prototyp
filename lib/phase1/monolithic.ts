import { parse, Allow } from "partial-json";
import { callLLM, callLLMStream, LlmValidationError } from "@/lib/openai";
import { buildPhase1Prompt } from "@/lib/prompts/phase1";
import { buildPhase1IncrementalPrompt } from "@/lib/prompts/phase1Incremental";
import {
  createPhase1IncrementalResponseSchema,
  createPhase1ResponseSchema,
  phase1StatementSchema,
  type Phase1Statement,
} from "@/lib/schemas/phase1";
import { persistPhase1Atomically } from "./persist";
import { phase1Config } from "./config";
import type { Phase1Context } from "./types";
import type { Phase1StreamEvent } from "./events";
import { createPreviewId } from "./hashing";

const STREAM_PARSE_INTERVAL_MS = 200;

function buildPhase1RetryPreamble(targetCompetitorCount: number) {
  return [
    `PFLICHT-CHECK WETTBEWERB (targetCompetitorCount=${targetCompetitorCount}):`,
    `- GENAU ${targetCompetitorCount} verschiedene competitorLabels`,
    `- Je Label GENAU 6 COMPETITOR-Statements`,
    `- ZUSÄTZLICH 1–3 COMPETITOR-Landschafts-Aussagen OHNE competitorLabel`,
  ].join("\n");
}

function tryEmitPreviewStatements(
  buffer: string,
  emittedCount: number,
  emit?: (event: Phase1StreamEvent) => void
): number {
  if (!emit) return emittedCount;
  try {
    const partial = parse(buffer, Allow.ARR | Allow.OBJ) as {
      statements?: unknown[];
    };
    const statements = partial?.statements;
    if (!Array.isArray(statements)) return emittedCount;

    let nextEmitted = emittedCount;
    for (let index = emittedCount; index < statements.length; index++) {
      const candidate = statements[index];
      const parsed = phase1StatementSchema.safeParse(candidate);
      if (!parsed.success) break;
      emit({
        type: "statement",
        module: "pestel",
        previewId: createPreviewId("monolith", index),
        data: parsed.data,
      });
      nextEmitted = index + 1;
    }
    return nextEmitted;
  } catch {
    return emittedCount;
  }
}

export async function runMonolithicPhase1(
  context: Phase1Context,
  signal?: AbortSignal,
  emit?: (event: Phase1StreamEvent) => void
) {
  const phasePrompt = context.isIncremental
    ? `${buildPhase1Prompt(context.targetCompetitorCount)}\n\n${buildPhase1IncrementalPrompt(
        {
          targetCompetitorCount: context.targetCompetitorCount,
          adoptedCompetitorLabelCount: context.adoptedCompetitorLabelCount,
          requiredNewProfiles: context.requiredNewProfiles,
        }
      )}`
    : buildPhase1Prompt(context.targetCompetitorCount);

  const llmContext = {
    targetCompetitorCount: context.targetCompetitorCount,
    ventureAnchors: context.ventureAnchors,
    adoptedAnchorsForPestel: context.adoptedAnchorsForPestel,
    startupProfile: context.startupProfile,
    ...(context.adoptedAnalysis.length > 0
      ? { adoptedAnalysisStatements: context.adoptedAnalysis }
      : {}),
  };

  const responseSchema = context.isIncremental
    ? createPhase1IncrementalResponseSchema(context.adoptedAnalysis, {
        targetCompetitorCount: context.targetCompetitorCount,
        requiredNewProfiles: context.requiredNewProfiles,
      })
    : createPhase1ResponseSchema(context.targetCompetitorCount);

  const retryPreamble = buildPhase1RetryPreamble(
    context.targetCompetitorCount
  );

  let result: { statements: Phase1Statement[]; pestelRelevance: unknown };

  if (context.isIncremental || !emit) {
    result = await callLLM(phasePrompt, llmContext, responseSchema, {
      maxTokens: phase1Config.maxTokens,
      validationRetries: 2,
      retryPreamble,
    });
  } else {
    let buffer = "";
    let emittedCount = 0;
    let lastParseAt = 0;
    let finishReason: string | null = null;

    const streamIterator = callLLMStream(phasePrompt, llmContext, {
      maxTokens: phase1Config.maxTokens,
    });
    let next = await streamIterator.next();
    while (!next.done) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      buffer += next.value;
      const now = Date.now();
      if (now - lastParseAt >= STREAM_PARSE_INTERVAL_MS) {
        lastParseAt = now;
        emittedCount = tryEmitPreviewStatements(buffer, emittedCount, emit);
      }
      next = await streamIterator.next();
    }
    finishReason = next.value ?? null;
    emittedCount = tryEmitPreviewStatements(buffer, emittedCount, emit);

    try {
      result = responseSchema.parse(JSON.parse(buffer));
      if (finishReason === "length") {
        throw new LlmValidationError("Token-Limit erreicht.");
      }
    } catch {
      result = await callLLM(phasePrompt, llmContext, responseSchema, {
        maxTokens: phase1Config.maxTokens,
        validationRetries: 2,
        retryPreamble,
      });
    }
  }

  emit?.({ type: "persisting" });
  const persisted = await persistPhase1Atomically({
    runId: context.runId,
    projectId: context.projectId,
    statements: result.statements,
    pestelRelevance: result.pestelRelevance,
    adoptedAnalysis: context.adoptedAnalysis,
    isIncremental: context.isIncremental,
  });

  emit?.({ type: "final", data: persisted });
  return persisted;
}
