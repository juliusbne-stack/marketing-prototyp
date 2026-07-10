import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { LlmValidationError } from "@/lib/openai";
import { runPhase1Analysis, Phase1RunConflictError } from "@/lib/phase1/orchestrator";
import type { Phase1StreamEvent } from "@/lib/phase1/events";

/** Phase 1 can return 100+ statements — allow long runs locally and on Vercel. */
export const maxDuration = 300;

const requestSchema = z.object({
  projectId: z.string().min(1),
});

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
      {
        error:
          "Bitte zuerst das Start-up-Profil speichern — die Geschäftsidee ist Pflicht.",
      },
      { status: 400 }
    );
  }

  const adoptedCount = await prisma.statement.count({
    where: { projectId: project.id, phase: 1, adopted: true },
  });
  const isIncremental = adoptedCount > 0;

  if (isIncremental) {
    try {
      const payload = await runPhase1Analysis({
        projectId: project.id,
        signal: request.signal,
      });
      return NextResponse.json(payload, { status: 201 });
    } catch (error) {
      if (error instanceof Phase1RunConflictError) {
        return NextResponse.json(
          { error: error.message, activeRunId: error.activeRunId },
          { status: 409 }
        );
      }
      return phase1LlmErrorResponse(error);
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const writeLine = (line: string) => {
        controller.enqueue(encoder.encode(`${line}\n`));
      };

      const emit = (event: Phase1StreamEvent) => {
        writeLine(JSON.stringify(event));
      };

      try {
        await runPhase1Analysis({
          projectId: project.id,
          signal: request.signal,
          emit,
        });
        controller.close();
      } catch (error) {
        const message =
          error instanceof LlmValidationError
            ? "Die KI-Antwort konnte nicht verarbeitet werden. Erneut versuchen — deine Eingaben bleiben erhalten."
            : "Die Analyse konnte nicht erstellt werden. Erneut versuchen — deine Eingaben bleiben erhalten.";
        writeLine(
          JSON.stringify({
            type: "error",
            recoverable: true,
            message,
            ...(process.env.NODE_ENV === "development" &&
            error instanceof Error
              ? { details: error.message }
              : {}),
          })
        );
        controller.close();
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
