import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callLLM, LlmValidationError } from "@/lib/openai";
import { TASK_ELABORATION_REFINE_PROMPT } from "@/lib/prompts/taskElaborationRefine";
import {
  taskElaborationRefineRequestSchema,
  taskElaborationRefineResponseSchema,
} from "@/lib/schemas/taskElaborationRefine";
import { taskElaborationResponseSchema } from "@/lib/schemas/taskElaboration";
import {
  buildImplementationStatements,
  implementationStatementsById,
} from "@/lib/implementationStatements";
import {
  buildCopyBasis,
  buildCopyRefineStepContext,
  buildStartupProfile,
} from "@/lib/implementationContext";
import { ACTIVE_ADOPTED_WHERE } from "@/lib/statementFilters";
import { formatImplementationGoals } from "@/lib/formatImplementationGoals";

// Feedback-based revision of an existing task elaboration — preview only;
// the client persists via PATCH on the elaborate route when the user adopts.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = taskElaborationRefineRequestSchema.safeParse(body);

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
          assumption: {
            select: { id: true, content: true, evidenceStatus: true },
          },
          metrics: {
            select: {
              name: true,
              successCriterion: true,
              failureCriterion: true,
            },
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
          "Ausarbeitungen sind nur für übernommene Umsetzungsschritte möglich.",
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
  const statementMap = implementationStatementsById(adoptedStatements);
  const startupProfile = buildStartupProfile(task.step.project);
  const copyBasis = buildCopyBasis(
    adoptedStatements,
    startupProfile,
    task.step.channel
  );

  const targetingGrundlage =
    elaboration.data.targeting.vorhanden
      ? elaboration.data.targeting.basiertAufAussageIds
          .map((id) => {
            const statement = statementMap.get(id);
            if (!statement) return null;
            return {
              id: statement.id,
              kategorie: statement.category,
              text: statement.content,
              evidenzstatus: statement.evidenceStatus,
            };
          })
          .filter((entry) => entry !== null)
      : [];

  const context = {
    startupKontext: startupProfile,
    aufgabe: {
      titel: task.title,
      beschreibung: task.hint,
      erfolgskriterium: task.erfolgskriterium,
    },
    massnahmenkarte: {
      titel: task.step.title,
      beschreibung: task.step.description,
      kanal: task.step.channel,
      gepruefteAnnahme: task.step.assumption.content,
      gepruefteAnnahmeEvidenzstatus: task.step.assumption.evidenceStatus,
      zeitraum: task.step.timeframe,
      budgetConstraint: task.step.budgetFrame,
      zielErfolgskriterien: formatImplementationGoals(
        task.step.metrics,
        task.step.timeframe
      ),
      kennzahlen: task.step.metrics,
    },
    aktuelleAusarbeitung: elaboration.data,
    targetingGrundlage,
    copyBasis,
    aufgabenReihenfolgeImSchritt: buildCopyRefineStepContext(
      task.id,
      task.step.tasks
    ),
    nutzerFeedback: parsed.data.feedback,
    previousFeedbackRounds: parsed.data.previousRounds,
  };

  let result;
  try {
    result = await callLLM(
      TASK_ELABORATION_REFINE_PROMPT,
      context,
      taskElaborationRefineResponseSchema
    );
  } catch (error) {
    if (error instanceof LlmValidationError) {
      return NextResponse.json(
        {
          error:
            "Die KI-Antwort konnte nicht verarbeitet werden. Erneut versuchen — die bisherige Ausarbeitung bleibt erhalten.",
        },
        { status: 502 }
      );
    }
    console.error("Task elaboration refine LLM call failed:", error);
    return NextResponse.json(
      {
        error:
          "Der Überarbeitungsvorschlag konnte nicht erstellt werden. Erneut versuchen — die bisherige Ausarbeitung bleibt erhalten.",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ proposal: result }, { status: 200 });
}
