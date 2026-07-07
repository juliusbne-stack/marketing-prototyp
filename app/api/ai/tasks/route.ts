import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { callLLM, LlmValidationError } from "@/lib/openai";
import { TASKS_PROMPT } from "@/lib/prompts/tasks";
import { tasksResponseSchemaWithValidIds } from "@/lib/schemas/tasks";
import {
  buildImplementationStatements,
  implementationStatementsById,
} from "@/lib/implementationStatements";
import { buildStartupProfile } from "@/lib/implementationContext";
import { taskSelect } from "@/lib/tasks";

const requestSchema = z.object({
  stepId: z.string().min(1),
});

// Decomposes ONE adopted validation step into 3–7 small, chronologically
// ordered tasks for the implementation period (Umsetzungs-Cockpit).
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "stepId fehlt in der Anfrage." },
      { status: 400 }
    );
  }

  const step = await prisma.validationStep.findUnique({
    where: { id: parsed.data.stepId },
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
      assumption: { select: { content: true, evidenceStatus: true } },
      metrics: {
        select: { name: true, successCriterion: true, failureCriterion: true },
      },
      tasks: { select: { id: true } },
    },
  });

  if (!step) {
    return NextResponse.json(
      { error: "Der Umsetzungsschritt wurde nicht gefunden." },
      { status: 404 }
    );
  }

  if (!step.adopted) {
    return NextResponse.json(
      {
        error:
          "Aufgaben gibt es nur für übernommene Umsetzungsschritte. Übernimm den Schritt zuerst in Phase 4.",
      },
      { status: 400 }
    );
  }

  if (step.tasks.length > 0) {
    return NextResponse.json(
      { error: "Für diesen Schritt existieren bereits Aufgaben." },
      { status: 409 }
    );
  }

  const adoptedAnalysis = await prisma.statement.findMany({
    where: { projectId: step.projectId, phase: 1, adopted: true },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      category: true,
      content: true,
      evidenceStatus: true,
    },
  });

  const adoptedStatements = buildImplementationStatements(
    step.option.statements,
    adoptedAnalysis
  );
  const validIds = new Set(adoptedStatements.map((statement) => statement.id));
  const statementMap = implementationStatementsById(adoptedStatements);

  const project = step.project;
  const context = {
    startupProfile: buildStartupProfile(project),
    prioritizedOption: {
      title: step.option.title,
      summary: step.option.summary,
    },
    adoptedStatements: adoptedStatements.map((statement) => ({
      id: statement.id,
      category: statement.category,
      text: statement.content,
      evidenceStatus: statement.evidenceStatus,
    })),
    step: {
      title: step.title,
      description: step.description,
      channel: step.channel,
      timeframe: step.timeframe,
      budgetFrame: step.budgetFrame,
      testedAssumption: step.assumption.content,
      metrics: step.metrics,
    },
  };

  let result;
  try {
    result = await callLLM(
      TASKS_PROMPT,
      context,
      tasksResponseSchemaWithValidIds(validIds)
    );
  } catch (error) {
    if (error instanceof LlmValidationError) {
      return NextResponse.json(
        {
          error:
            "Die KI-Antwort konnte nicht verarbeitet werden. Erneut versuchen — dein Umsetzungsschritt bleibt erhalten.",
        },
        { status: 502 }
      );
    }
    console.error("Task decomposition LLM call failed:", error);
    return NextResponse.json(
      {
        error:
          "Die Aufgaben konnten nicht erstellt werden. Erneut versuchen — dein Umsetzungsschritt bleibt erhalten.",
      },
      { status: 502 }
    );
  }

  // Guard against a concurrent generation for the same step.
  const tasks = await prisma.$transaction(async (tx) => {
    const existing = await tx.task.count({ where: { stepId: step.id } });
    if (existing > 0) return null;

    await tx.task.createMany({
      data: result.tasks.map((task, index) => ({
        stepId: step.id,
        title: task.title,
        hint: task.hint,
        annahmenBezugId: task.annahmenBezugId,
        erfolgskriterium: task.erfolgskriterium,
        sortOrder: index,
      })),
    });

    return tx.task.findMany({
      where: { stepId: step.id },
      orderBy: { sortOrder: "asc" },
      select: taskSelect,
    });
  });

  if (!tasks) {
    return NextResponse.json(
      { error: "Für diesen Schritt existieren bereits Aufgaben." },
      { status: 409 }
    );
  }

  // Attach resolved assumption refs for the client (not stored separately).
  const tasksWithRefs = tasks.map((task) => ({
    ...task,
    annahmenBezug: task.annahmenBezugId
      ? (statementMap.get(task.annahmenBezugId) ?? null)
      : null,
  }));

  return NextResponse.json({ tasks: tasksWithRefs }, { status: 201 });
}
