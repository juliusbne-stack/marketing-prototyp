import OpenAI from "openai";
import type { z } from "zod";
import { GLOBAL_PROMPT } from "./prompts/global";

// Server-side only (architecture rule 1) — never import from client components.
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MODEL = "gpt-4o";

export class LlmValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmValidationError";
  }
}

/**
 * Calls the LLM with GLOBAL + phase prompt as system message and the project
 * context as user message. The response is parsed with the given Zod schema.
 * On a parse failure there is exactly ONE retry that includes the validation
 * error; if that fails too, an LlmValidationError is thrown (architecture rule 2).
 */
export async function callLLM<Schema extends z.ZodType>(
  phasePrompt: string,
  context: unknown,
  schema: Schema
): Promise<z.infer<Schema>> {
  const systemPrompt = `${GLOBAL_PROMPT}\n\n${phasePrompt}`;
  const contextMessage = `PROJEKTKONTEXT (JSON):\n${JSON.stringify(context, null, 2)}`;

  async function requestOnce(retryHint?: string): Promise<z.infer<Schema>> {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: contextMessage },
        ...(retryHint
          ? [{ role: "user" as const, content: retryHint }]
          : []),
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      throw new LlmValidationError("Die KI hat keine Antwort geliefert.");
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
        `Die Antwort entsprach nicht dem Schema: ${parsed.error.message.slice(0, 500)}`
      );
    }
    return parsed.data;
  }

  try {
    return await requestOnce();
  } catch (error) {
    if (!(error instanceof LlmValidationError)) throw error;
    // Exactly one retry with the validation error as hint.
    return await requestOnce(
      `Deine letzte Antwort war ungültig und wurde verworfen. Fehler: ${error.message}\n` +
        "Antworte erneut und halte dich EXAKT an das geforderte JSON-Schema. " +
        "Nur JSON, kein Text davor oder danach."
    );
  }
}
