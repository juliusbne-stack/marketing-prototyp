import { NextResponse } from "next/server";
import OpenAI from "openai";
import { GLOBAL_PROMPT } from "@/lib/prompts/global";
import { STRATEGY_ASSISTANT_PROMPT } from "@/lib/prompts/strategyAssistant";
import { verifyStrategyAssistantVorschlag, degradationMessage } from "@/lib/phase4/strategyAssistant";
import { mapLlmCallError } from "@/lib/openai";
import {
  assistentAntwortSchema,
  strategyAssistantRequestSchema,
  type AssistentAntwort,
} from "@/lib/schemas/strategyAssistant";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = "gpt-4o";

const FALLBACK_ANTWORT: AssistentAntwort = {
  modus: "antwort",
  nachricht:
    "Die Antwort konnte nicht verarbeitet werden. Bitte formuliere deine Frage erneut — der bisherige Karteninhalt bleibt unverändert.",
};

// Read-only strategy assistant for one Phase 4 validation card — no DB access.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = strategyAssistantRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Die Anfrage konnte nicht verarbeitet werden." },
      { status: 400 }
    );
  }

  const { kontext, verlauf } = parsed.data;
  const systemPrompt = `${GLOBAL_PROMPT}\n\n${STRATEGY_ASSISTANT_PROMPT}`;
  const contextBlock = `KARTENKONTEXT (JSON):\n${JSON.stringify(kontext, null, 2)}`;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: contextBlock },
    ...verlauf.map((entry) => ({
      role: entry.rolle === "user" ? ("user" as const) : ("assistant" as const),
      content: entry.inhalt,
    })),
  ];

  let raw: string;
  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      max_tokens: 2048,
      response_format: { type: "json_object" },
      messages,
    });
    raw = completion.choices[0]?.message?.content ?? "";
    if (!raw) {
      return NextResponse.json(FALLBACK_ANTWORT);
    }
  } catch (error) {
    console.error("Strategy assistant LLM call failed:", error);
    return NextResponse.json(
      {
        error: mapLlmCallError(
          error,
          "Der Strategie Assistent ist vorübergehend nicht erreichbar. Erneut versuchen."
        ),
      },
      { status: 502 }
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json(FALLBACK_ANTWORT);
  }

  const validated = assistentAntwortSchema.safeParse(json);
  if (!validated.success) {
    return NextResponse.json(FALLBACK_ANTWORT);
  }

  let antwort = validated.data;

  if (antwort.modus === "vorschlag") {
    const verification = verifyStrategyAssistantVorschlag(
      kontext,
      antwort.vorschlag
    );
    if (!verification.ok) {
      antwort = {
        modus: "antwort",
        nachricht: degradationMessage(verification.reason),
      };
    }
  }

  return NextResponse.json(antwort);
}
