import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callLLM, LlmValidationError } from "@/lib/openai";
import { COPY_REFINE_PROMPT } from "@/lib/prompts/copyRefine";
import {
  copyRefineRequestSchema,
  copyRefineResponseSchema,
} from "@/lib/schemas/copyRefine";
import { taskElaborationResponseSchema } from "@/lib/schemas/taskElaboration";
import { buildImplementationStatements } from "@/lib/implementationStatements";
import {
  buildCopyBasis,
  buildCopyRefineStepContext,
  buildStartupProfile,
} from "@/lib/implementationContext";
import { ACTIVE_ADOPTED_WHERE } from "@/lib/statementFilters";
import { taskSelect } from "@/lib/tasks";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = copyRefineRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Feedback fehlt in der Anfrage." },
      { status: 400 }
    );
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      step: {
        include: {
          assumption: {
            select: { content: true },
          },
          tasks: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              title: true,
              hint: true,
              sortOrder: true,
              elaboration: true,
            },
          },
          project: true,
          option: {
            include: {
              statements: {
                include: {
                  statement: {
                    select: {
                      id: true,
                      category: true,
                      content: true,
                      evidenceStatus: true,
                      adopted: true,
                      supersededByStatementId: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!task) {
    return NextResponse.json(
      { error: "Die Aufgabe wurde nicht gefunden." },
      { status: 404 }
    );
  }

  if (!task.step.adopted) {
    return NextResponse.json(
      {
        error:
          "Copy-Verfeinerung ist nur für übernommene Umsetzungsschritte möglich.",
      },
      { status: 400 }
    );
  }

  const elaboration = taskElaborationResponseSchema.safeParse(task.elaboration);
  if (!elaboration.success) {
    return NextResponse.json(
      {
        error:
          "Es liegt noch keine Ausarbeitung vor. Erstelle zuerst ein Arbeitspaket.",
      },
      { status: 400 }
    );
  }

  if (elaboration.data.formulierungsvorschlaege.length === 0) {
    return NextResponse.json(
      {
        error:
          "Für diese Aufgabe gibt es keine Formulierungsvorschläge zum Verfeinern.",
      },
      { status: 400 }
    );
  }

  const adoptedAnalysis = await prisma.statement.findMany({
    where: { projectId: task.step.projectId, phase: 1, ...ACTIVE_ADOPTED_WHERE },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      category: true,
      content: true,
      evidenceStatus: true,
    },
  });

  const adoptedStatements = buildImplementationStatements(
    task.step.option.statements,
    adoptedAnalysis
  );
  const startupProfile = buildStartupProfile(task.step.project);
  const copyBasis = buildCopyBasis(
    adoptedStatements,
    startupProfile,
    task.step.channel
  );

  const context = {
    aufgabe: {
      titel: task.title,
      unterzeile: task.hint,
      erfolgskriterium: task.erfolgskriterium,
    },
    massnahmenkarte: {
      titel: task.step.title,
      kanal: task.step.channel,
      gepruefteAnnahme: task.step.assumption.content,
    },
    aufgabenReihenfolgeImSchritt: buildCopyRefineStepContext(
      task.id,
      task.step.tasks
    ),
    copyBasis,
    bisherigeFormulierungsvorschlaege: elaboration.data.formulierungsvorschlaege,
    nutzerFeedback: parsed.data.feedback,
    previousRounds: parsed.data.previousRounds,
  };

  let result;
  try {
    result = await callLLM(COPY_REFINE_PROMPT, context, copyRefineResponseSchema);
  } catch (error) {
    if (error instanceof LlmValidationError) {
      return NextResponse.json(
        {
          error:
            "Die Formulierungsvorschläge konnten nicht überarbeitet werden. Erneut versuchen.",
        },
        { status: 502 }
      );
    }
    console.error("Copy refine LLM call failed:", error);
    return NextResponse.json(
      {
        error:
          "Die Formulierungsvorschläge konnten nicht überarbeitet werden. Erneut versuchen.",
      },
      { status: 502 }
    );
  }

  const updatedElaboration = {
    ...elaboration.data,
    formulierungsvorschlaege: result.formulierungsvorschlaege,
  };

  const updated = await prisma.task.update({
    where: { id: task.id },
    data: { elaboration: updatedElaboration },
    select: taskSelect,
  });

  const parsedElaboration = taskElaborationResponseSchema.safeParse(
    updated.elaboration
  );

  return NextResponse.json({
    formulierungsvorschlaege: result.formulierungsvorschlaege,
    elaboration: parsedElaboration.success ? parsedElaboration.data : updatedElaboration,
  });
}
