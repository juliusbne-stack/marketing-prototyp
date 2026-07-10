import OpenAI from "openai";
import type { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { GLOBAL_PROMPT } from "@/lib/prompts/global";
import { LlmValidationError } from "./openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type LlmUsage = {
  inputTokens?: number;
  outputTokens?: number;
  cachedTokens?: number;
};

export type CallLlmStructuredOptions<Schema extends z.ZodType = z.ZodType> = {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  schema: Schema;
  schemaName: string;
  signal?: AbortSignal;
  serviceTier?: string;
  maxTokens?: number;
  module?: string;
};

export type CallLlmStructuredResult<T> = {
  data: T;
  durationMs: number;
  usage: LlmUsage;
};

function extractUsage(
  usage: OpenAI.Completions.CompletionUsage | undefined
): LlmUsage {
  if (!usage) return {};
  const cached =
    "prompt_tokens_details" in usage &&
    usage.prompt_tokens_details &&
    typeof usage.prompt_tokens_details === "object" &&
    "cached_tokens" in usage.prompt_tokens_details
      ? Number(
          (usage.prompt_tokens_details as { cached_tokens?: number })
            .cached_tokens ?? 0
        )
      : undefined;
  return {
    inputTokens: usage.prompt_tokens,
    outputTokens: usage.completion_tokens,
    cachedTokens: cached,
  };
}

/**
 * Strict structured output via OpenAI chat.completions.parse + Zod schema.
 */
export async function callLLMStructured<Schema extends z.ZodType>(
  options: CallLlmStructuredOptions<Schema>
): Promise<CallLlmStructuredResult<z.infer<Schema>>> {
  const startedAt = Date.now();
  const systemPrompt = `${GLOBAL_PROMPT}\n\n${options.systemPrompt}`;
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: options.userPrompt },
  ];

  const request: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming =
    {
      model: options.model,
      max_tokens: options.maxTokens ?? 16_384,
      messages,
      response_format: zodResponseFormat(
        options.schema,
        options.schemaName
      ),
    };

  if (options.serviceTier) {
    (request as { service_tier?: string }).service_tier = options.serviceTier;
  }

  if (options.signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  const completion = await openai.chat.completions.parse(request, {
    signal: options.signal,
  });

  const choice = completion.choices[0];
  const parsed = choice?.message?.parsed;
  if (!parsed) {
    const refusal = choice?.message?.refusal;
    throw new LlmValidationError(
      refusal
        ? `Die KI hat die Anfrage abgelehnt: ${refusal}`
        : "Die KI-Antwort konnte nicht geparst werden."
    );
  }

  const durationMs = Date.now() - startedAt;
  if (options.module) {
    console.info(
      `[phase1-llm] module=${options.module} model=${options.model} durationMs=${durationMs}`
    );
  }

  return {
    data: parsed as z.infer<Schema>,
    durationMs,
    usage: extractUsage(completion.usage),
  };
}

export { openai };
