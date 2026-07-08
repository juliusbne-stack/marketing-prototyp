import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { callLLM, LlmValidationError } from "@/lib/openai";
import { TASK_ELABORATION_PROMPT } from "@/lib/prompts/taskElaboration";
import { taskElaborationResponseSchema } from "@/lib/schemas/taskElaboration";
import {
  buildImplementationStatements,
  implementationStatementsById,
} from "@/lib/implementationStatements";
import {
  buildStartupProfile,
  buildTaskElaborationContext,
  getMissingImplementationCategories,
} from "@/lib/implementationContext";
import { formatImplementationGoals } from "@/lib/formatImplementationGoals";
import { taskSelect } from "@/lib/tasks";

const MODEL = "gpt-4o";

const requestSchema = z.object({
  regenerate: z.boolean().optional(),
});

const patchSchema = z.object({
  elaboration: taskElaborationResponseSchema,
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = requestSchema.safeParse(body);
  const regenerate = parsed.success ? (parsed.data.regenerate ?? false) : false;

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
      { error: "Ausarbeitungen sind nur für übernommene Umsetzungsschritte möglich." },
      { status: 400 }
    );
  }

  if (task.elaboration && !regenerate) {
    const elaboration = taskElaborationResponseSchema.safeParse(task.elaboration);
    if (elaboration.success) {
      return NextResponse.json({
        elaboration: elaboration.data,
        generatedAt: task.elaborationGeneratedAt,
        model: task.elaborationModel,
        cached: true,
      });
    }
  }

  const adoptedAnalysis = await prisma.statement.findMany({
    where: { projectId: task.step.projectId, phase: 1, adopted: true },
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
  const annahmenBezug = task.annahmenBezugId
    ? (statementMap.get(task.annahmenBezugId) ?? null)
    : null;

  const context = buildTaskElaborationContext({
    step: {
      title: task.step.title,
      description: task.step.description,
      channel: task.step.channel,
      timeframe: task.step.timeframe,
      budgetFrame: task.step.budgetFrame,
      status: "In Umsetzung",
      testedAssumption: {
        content: task.step.assumption.content,
        evidenceStatus: task.step.assumption.evidenceStatus,
      },
      goal: formatImplementationGoals(task.step.metrics, task.step.timeframe),
      metrics: task.step.metrics,
    },
    task: {
      id: task.id,
      title: task.title,
      hint: task.hint,
      erfolgskriterium: task.erfolgskriterium,
      annahmenBezug: annahmenBezug
        ? {
            id: annahmenBezug.id,
            content: annahmenBezug.content,
            evidenceStatus:
              annahmenBezug.evidenceStatus as typeof task.step.assumption.evidenceStatus,
          }
        : null,
    },
    adoptedStatements,
    missingCategories: getMissingImplementationCategories(adoptedStatements),
    startupProfile: buildStartupProfile(task.step.project),
    stepTasks: task.step.tasks,
  });

  let result;
  try {
    result = await callLLM(
      TASK_ELABORATION_PROMPT,
      context,
      taskElaborationResponseSchema
    );
  } catch (error) {
    if (error instanceof LlmValidationError) {
      return NextResponse.json(
        {
          error:
            "Die Ausarbeitung konnte nicht erstellt werden. Erneut versuchen.",
        },
        { status: 502 }
      );
    }
    console.error("Task elaboration LLM call failed:", error);
    return NextResponse.json(
      {
        error:
          "Die Ausarbeitung konnte nicht erstellt werden. Erneut versuchen.",
      },
      { status: 502 }
    );
  }

  const updated = await prisma.task.update({
    where: { id: task.id },
    data: {
      elaboration: result,
      elaborationGeneratedAt: new Date(),
      elaborationModel: MODEL,
    },
    select: taskSelect,
  });

  return NextResponse.json({
    elaboration: result,
    generatedAt: updated.elaborationGeneratedAt,
    model: updated.elaborationModel,
    cached: false,
  });
}

// Persists an adopted elaboration revision (e.g. after feedback-based preview).
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Die Ausarbeitung konnte nicht verarbeitet werden." },
      { status: 400 }
    );
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { step: { select: { adopted: true } } },
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

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      elaboration: parsed.data.elaboration,
      elaborationGeneratedAt: new Date(),
      elaborationModel: MODEL,
    },
    select: taskSelect,
  });

  return NextResponse.json({
    elaboration: parsed.data.elaboration,
    generatedAt: updated.elaborationGeneratedAt,
    model: updated.elaborationModel,
  });
}
