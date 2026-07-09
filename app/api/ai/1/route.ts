import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { parse, Allow } from "partial-json";
import { prisma } from "@/lib/prisma";
import { callLLM, callLLMStream, LlmValidationError } from "@/lib/openai";
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
  phase1StatementSchema,
  type Phase1Statement,
} from "@/lib/schemas/phase1";
import { filterDuplicateStatements } from "@/lib/statementDedup";
import {
  buildVentureAnchors,
  filterAdoptedAnchorsForPestel,
} from "@/lib/ventureAnchors";

/** Phase 1 can return 100+ statements — allow long runs locally and on Vercel. */
export const maxDuration = 300;

/** Large JSON output for many competitor profiles (9–17 actors × 6 aspects). */
const PHASE1_MAX_TOKENS = 16_384;

const STREAM_PARSE_INTERVAL_MS = 200;

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

type Phase1FinalPayload = {
  statements: Prisma.StatementGetPayload<{ select: typeof statementSelect }>[];
  pestelRelevance: unknown;
  incremental: boolean;
  filteredDuplicateCount: number;
};

function buildPhase1RetryPreamble(
  targetCompetitorCount: number,
  ventureAnchors: ReturnType<typeof buildVentureAnchors>
) {
  return [
    `PFLICHT-CHECK WETTBEWERB (targetCompetitorCount=${targetCompetitorCount} im Projektkontext):`,
    `- GENAU ${targetCompetitorCount} verschiedene competitorLabels`,
    `- Je Label GENAU 6 COMPETITOR-Statements (alle competitorAspect-Werte)`,
    `- ZUSÄTZLICH 1–3 COMPETITOR-Landschafts-Aussagen OHNE competitorLabel`,
    "- COMPETITOR-Bereich nicht kürzen — auch wenn andere Bereiche schon vollständig sind",
    "",
    "PFLICHT-CHECK PESTEL:",
    `- ventureAnchors.fehlendeAnker=${JSON.stringify(ventureAnchors.fehlendeAnker)}`,
    ventureAnchors.fehlendeAnker.includes("Zielsegment")
      ? "- Mindestens eine PESTEL-Aussage MUSS evidenceStatus OPEN_QUESTION haben (offene Frage auf Implikation/Passung — nicht auf Faktor-Existenz; fehlendes Zielsegment)"
      : "",
    "- Jede PESTEL-Aussage: externer Faktor + tragender Anker (Anker muss Konsequenz verändern, nicht nur erwähnt sein)",
    "- evidenceStatus bezieht sich auf die IMPLIKATION: FACT nur bei belegbarer Konsequenz für dieses Vorhaben — Kanal-/Trend-Verbreitung rechtfertigt keinen FACT für Wirksamkeit",
    "- Keine Kanal-/Maßnahmen-/Positionierungsentscheidungen (z. B. „über Kanal X vermarkten\", „auf Plattform Y setzen\") — nur Faktor + prüfbare Konsequenz",
    "- Self-Check pro PESTEL-Aussage: (1) Implikations-Evidenz korrekt? (2) Anker trägt Aussage? (3) keine Maßnahmenentscheidung? (4) Regel 1 Externer-Faktor. Durchgefallene Aussagen reformulieren oder verwerfen",
  ]
    .filter(Boolean)
    .join("\n");
}

function validatePhase1JsonBuffer<Schema extends z.ZodType>(
  buffer: string,
  schema: Schema,
  maxTokens: number,
  finishReason?: string | null
): z.infer<Schema> {
  if (!buffer.trim()) {
    throw new LlmValidationError("Die KI hat keine Antwort geliefert.");
  }

  if (finishReason === "length") {
    throw new LlmValidationError(
      `Die Antwort wurde am Token-Limit (${maxTokens}) abgeschnitten — JSON unvollständig.`
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(buffer);
  } catch {
    throw new LlmValidationError(
      `Die Antwort war kein gültiges JSON. Antwortbeginn: ${buffer.slice(0, 200)}`
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

function tryEmitPreviewStatements(
  buffer: string,
  emittedCount: number,
  writeLine: (line: string) => void
): number {
  try {
    const partial = parse(buffer, Allow.ARR | Allow.OBJ) as {
      statements?: unknown[];
    };
    const statements = partial?.statements;
    if (!Array.isArray(statements)) {
      return emittedCount;
    }

    let nextEmitted = emittedCount;
    for (let index = emittedCount; index < statements.length; index++) {
      const candidate = statements[index];
      const parsed = phase1StatementSchema.safeParse(candidate);
      if (!parsed.success) {
        break;
      }
      writeLine(
        JSON.stringify({ type: "statement", data: parsed.data })
      );
      nextEmitted = index + 1;
    }
    return nextEmitted;
  } catch {
    return emittedCount;
  }
}

type AdoptedContext = Prisma.StatementGetPayload<{
  select: typeof adoptedContextSelect;
}>;

async function persistPhase1Result(
  projectId: string,
  result: { statements: Phase1Statement[]; pestelRelevance: unknown },
  adoptedAnalysis: AdoptedContext[],
  isIncremental: boolean
): Promise<Phase1FinalPayload> {
  const { kept: newStatements, filtered: filteredDuplicates } =
    filterDuplicateStatements<Phase1Statement>(result.statements, adoptedAnalysis);

  const { statements, pestelRelevance } = await prisma.$transaction(async (tx) => {
    await tx.statement.deleteMany({
      where: { projectId, phase: 1, adopted: false },
    });
    if (newStatements.length > 0) {
      await tx.statement.createMany({
        data: newStatements.map((statement) => ({
          projectId,
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
      where: { id: projectId },
      data: {
        pestelRelevance: result.pestelRelevance as Prisma.InputJsonValue,
      },
    });
    const savedStatements = await tx.statement.findMany({
      where: { projectId, phase: 1 },
      orderBy: { createdAt: "asc" },
      select: statementSelect,
    });
    return {
      statements: savedStatements,
      pestelRelevance: result.pestelRelevance,
    };
  });

  return {
    statements,
    pestelRelevance,
    incremental: isIncremental,
    filteredDuplicateCount: filteredDuplicates.length,
  };
}

function phase1LlmErrorResponse(error: unknown) {
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

  const targetCompetitorCount = pickRandomTargetCompetitorCount();
  const adoptedCompetitorLabelCount =
    countAdoptedCompetitorLabels(adoptedAnalysis);
  const requiredNewProfiles = requiredNewCompetitorProfiles(
    targetCompetitorCount,
    adoptedCompetitorLabelCount
  );

  const ventureAnchors = buildVentureAnchors(project);
  const adoptedAnchorsForPestel = filterAdoptedAnchorsForPestel(
    isIncremental ? adoptedAnalysis : []
  );

  const context = {
    targetCompetitorCount,
    ventureAnchors,
    adoptedAnchorsForPestel,
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

  const retryPreamble = buildPhase1RetryPreamble(
    targetCompetitorCount,
    ventureAnchors
  );

  if (isIncremental) {
    let result;
    try {
      result = await callLLM(phasePrompt, context, responseSchema, {
        maxTokens: PHASE1_MAX_TOKENS,
        validationRetries: 2,
        retryPreamble,
      });
    } catch (error) {
      return phase1LlmErrorResponse(error);
    }

    const payload = await persistPhase1Result(
      project.id,
      result,
      adoptedAnalysis,
      isIncremental
    );

    return NextResponse.json(payload, { status: 201 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const writeLine = (line: string) => {
        controller.enqueue(encoder.encode(`${line}\n`));
      };

      const writeError = (message: string, details?: string) => {
        writeLine(
          JSON.stringify({
            type: "error",
            message,
            ...(process.env.NODE_ENV === "development" && details
              ? { details }
              : {}),
          })
        );
        controller.close();
      };

      try {
        let buffer = "";
        let emittedCount = 0;
        let lastParseAt = 0;
        let finishReason: string | null = null;

        const streamIterator = callLLMStream(phasePrompt, context, {
          maxTokens: PHASE1_MAX_TOKENS,
        });
        let next = await streamIterator.next();
        while (!next.done) {
          buffer += next.value;
          const now = Date.now();
          if (now - lastParseAt >= STREAM_PARSE_INTERVAL_MS) {
            lastParseAt = now;
            emittedCount = tryEmitPreviewStatements(
              buffer,
              emittedCount,
              writeLine
            );
          }
          next = await streamIterator.next();
        }
        finishReason = next.value ?? null;

        emittedCount = tryEmitPreviewStatements(buffer, emittedCount, writeLine);

        let result: { statements: Phase1Statement[]; pestelRelevance: unknown };
        try {
          result = validatePhase1JsonBuffer(
            buffer,
            responseSchema,
            PHASE1_MAX_TOKENS,
            finishReason
          );
        } catch (streamValidationError) {
          if (!(streamValidationError instanceof LlmValidationError)) {
            throw streamValidationError;
          }
          console.error(
            "Phase 1 streamed response validation failed, retrying via callLLM:",
            streamValidationError.message
          );
          result = await callLLM(phasePrompt, context, responseSchema, {
            maxTokens: PHASE1_MAX_TOKENS,
            validationRetries: 2,
            retryPreamble,
          });
        }

        const payload = await persistPhase1Result(
          project.id,
          result,
          adoptedAnalysis,
          isIncremental
        );

        writeLine(JSON.stringify({ type: "final", data: payload }));
        controller.close();
      } catch (error) {
        if (error instanceof LlmValidationError) {
          writeError(
            "Die KI-Antwort konnte nicht verarbeitet werden. Erneut versuchen — deine Eingaben bleiben erhalten.",
            error.message
          );
          return;
        }
        console.error("Phase 1 streamed LLM call failed:", error);
        writeError(
          "Die Analyse konnte nicht erstellt werden. Erneut versuchen — deine Eingaben bleiben erhalten."
        );
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
