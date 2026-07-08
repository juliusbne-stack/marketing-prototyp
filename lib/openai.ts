import OpenAI from "openai";
import type { z } from "zod";
import { GLOBAL_PROMPT } from "./prompts/global";

// Server-side only (architecture rule 1) — never import from client components.
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MODEL = "gpt-4o";

/** Default output budget; Phase 1 overrides with a higher limit (many statements). */
const DEFAULT_MAX_TOKENS = 4096;

export type CallLlmOptions = {
  maxTokens?: number;
  /** Retries after a validation failure (default 1 → 2 attempts total). */
  validationRetries?: number;
  /** Prepended to each retry hint (phase-specific constraints). */
  retryPreamble?: string;
};

export class LlmValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmValidationError";
  }
}

/**
 * Calls the LLM with GLOBAL + phase prompt as system message and the project
 * context as user message. The response is parsed with the given Zod schema.
 * On parse failure, retries with the validation error as hint (see validationRetries).
 */
export async function callLLM<Schema extends z.ZodType>(
  phasePrompt: string,
  context: unknown,
  schema: Schema,
  options: CallLlmOptions = {}
): Promise<z.infer<Schema>> {
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
  const validationRetries = options.validationRetries ?? 1;
  const systemPrompt = `${GLOBAL_PROMPT}\n\n${phasePrompt}`;
  const contextMessage = `PROJEKTKONTEXT (JSON):\n${JSON.stringify(context, null, 2)}`;

  async function requestOnce(retryHint?: string): Promise<z.infer<Schema>> {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: contextMessage },
        ...(retryHint
          ? [{ role: "user" as const, content: retryHint }]
          : []),
      ],
    });

    const choice = completion.choices[0];
    const raw = choice?.message?.content;
    if (!raw) {
      throw new LlmValidationError("Die KI hat keine Antwort geliefert.");
    }

    if (choice.finish_reason === "length") {
      throw new LlmValidationError(
        `Die Antwort wurde am Token-Limit (${maxTokens}) abgeschnitten — JSON unvollständig.`
      );
    }

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      throw new LlmValidationError(
        `Die Antwort war kein gültiges JSON. Antwortbeginn: ${raw.slice(0, 200)}`
      );
    }

    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      throw new LlmValidationError(
        `Die Antwort entsprach nicht dem Schema: ${parsed.error.message.slice(0, 2000)}`
      );
    }
    return parsed.data;
  }

  function buildRetryHint(error: LlmValidationError): string {
    const preamble = options.retryPreamble?.trim();
    return (
      (preamble ? `${preamble}\n\n` : "") +
      `Deine letzte Antwort war ungültig und wurde verworfen. Fehler: ${error.message}\n` +
      "Antworte erneut und halte dich EXAKT an das geforderte JSON-Schema. " +
      "Nur JSON, kein Text davor oder danach."
    );
  }

  let lastError: LlmValidationError | undefined;
  for (let attempt = 0; attempt <= validationRetries; attempt++) {
    try {
      return await requestOnce(
        attempt === 0 ? undefined : buildRetryHint(lastError!)
      );
    } catch (error) {
      if (!(error instanceof LlmValidationError)) throw error;
      lastError = error;
      if (attempt === validationRetries) throw error;
    }
  }

  throw lastError ?? new LlmValidationError("Unbekannter Validierungsfehler.");
}

/** Maps OpenAI API failures to short, actionable German user messages. */
export function mapLlmCallError(error: unknown, fallback: string): string {
  if (error instanceof LlmValidationError) {
    return "Die KI-Antwort konnte nicht verarbeitet werden. Erneut versuchen — deine bisherigen Inhalte bleiben erhalten.";
  }
  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
      ? (error as { status: number }).status
      : null;
  if (status === 429) {
    return "Das OpenAI-Kontingent ist aufgebraucht. Bitte prüfe deinen API-Plan und die Billing-Einstellungen unter platform.openai.com — deine bisherigen Inhalte bleiben erhalten.";
  }
  if (status === 401) {
    return "Der OpenAI-API-Schlüssel ist ungültig oder fehlt. Bitte prüfe die OPENAI_API_KEY-Einstellung in der .env — deine bisherigen Inhalte bleiben erhalten.";
  }
  return fallback;
}
