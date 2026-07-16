import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { callLLM, LlmValidationError } from "@/lib/openai";
import { TASKS_PROMPT } from "@/lib/prompts/tasks";
import { tasksResponseSchemaWithValidIds } from "@/lib/schemas/tasks";
import type { TaskItemResponse } from "@/lib/schemas/tasks";
import {
  buildPriorImplementationContext,
  deriveLaufmodusAndBasis,
  validateBereitsErfuelltTask,
  type PriorImplementation,
} from "@/lib/crossImplementation";
import {
  buildImplementationStatements,
  implementationStatementsById,
} from "@/lib/implementationStatements";
import { buildStartupProfile } from "@/lib/implementationContext";
import { ACTIVE_ADOPTED_WHERE } from "@/lib/statementFilters";
import { taskSelect } from "@/lib/tasks";
import { activeValidationStepWhere } from "@/lib/validationStep";
import { isDemoProject } from "@/lib/demo/identity";
import {
  DemoAiConflictError,
  DemoAiPreconditionError,
  serveDemoTasks,
} from "@/lib/demo/fakeAi";

const requestSchema = z.object({
  stepId: z.string().min(1),
});

function sanitizeGeneratedTask(
  task: TaskItemResponse,
  priorSteps: PriorImplementation[]
): TaskItemResponse {
  if (task.herkunft === "BEREITS_ERFUELLT") {
    const check = validateBereitsErfuelltTask(
      task.title,
      task.erfuelltDurchUmsetzungId,
      priorSteps
    );
    if (!check.valid) {
      return {
        ...task,
        herkunft: "NEU",
        erfuelltDurchUmsetzungId: null,
      };
    }
    return {
      ...task,
      erfuelltDurchUmsetzungId: check.stepId,
    };
  }

  if (task.herkunft === "GETEILT") {
    const stepExists = priorSteps.some(
      (step) => step.id === task.erfuelltDurchUmsetzungId
    );
    if (!stepExists) {
      return {
        ...task,
        herkunft: "NEU",
        erfuelltDurchUmsetzungId: null,
      };
    }
  }

  return task;
}

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
                  supersededByStatementId: true,
                  segmentLabel: true,
                },
              },
            },
          },
        },
      },
      assumption: {
        select: {
          content: true,
          evidenceStatus: true,
          category: true,
          segmentAspect: true,
        },
      },
      metrics: {
        select: {
          name: true,
          successCriterion: true,
          failureCriterion: true,
          metricRole: true,
          evaluationMode: true,
        },
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

  if (isDemoProject(step.project)) {
    try {
      const payload = await serveDemoTasks(step.id);
      return NextResponse.json(payload, { status: 201 });
    } catch (error) {
      if (error instanceof DemoAiPreconditionError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (error instanceof DemoAiConflictError) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      throw error;
    }
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

  const priorStepRows = await prisma.validationStep.findMany({
    where: {
      optionId: step.optionId,
      adopted: true,
      id: { not: step.id },
      ...activeValidationStepWhere,
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      title: true,
      channel: true,
      assumption: { select: { content: true } },
      tasks: {
        orderBy: { sortOrder: "asc" },
        select: {
          title: true,
          done: true,
          herkunft: true,
        },
      },
      feedbacks: { select: { id: true }, take: 1 },
    },
  });

  const priorSteps: PriorImplementation[] = priorStepRows.map((row) => ({
    id: row.id,
    title: row.title,
    channel: row.channel,
    assumptionContent: row.assumption.content,
    hasFeedback: row.feedbacks.length > 0,
    tasks: row.tasks,
  }));

  const priorStepIds = new Set(priorSteps.map((entry) => entry.id));
  const priorImplementationContext = buildPriorImplementationContext(priorSteps);
  const { laufmodus, basiertAufUmsetzungId } = deriveLaufmodusAndBasis(
    step.channel,
    priorSteps
  );

  const adoptedAnalysis = await prisma.statement.findMany({
    where: { projectId: step.projectId, phase: 1, ...ACTIVE_ADOPTED_WHERE },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      category: true,
      content: true,
      evidenceStatus: true,
      segmentLabel: true,
      segmentAspect: true,
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
    priorImplementations: priorImplementationContext,
    laufmodus,
    basiertAufUmsetzungId,
    step: {
      title: step.title,
      validationQuestion: step.validationQuestion,
      testDesign: step.testDesign,
      marketingActivities: step.marketingActivities,
      description: step.description,
      channel: step.channel,
      timeframe: step.timeframe,
      budgetFrame: step.budgetFrame,
      testedAssumption: step.assumption.content,
      assumptionCategory: step.assumption.category,
      assumptionSegmentAspect: step.assumption.segmentAspect,
      metrics: step.metrics,
    },
  };

  let result;
  try {
    result = await callLLM(
      TASKS_PROMPT,
      context,
      tasksResponseSchemaWithValidIds(validIds, priorStepIds)
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

  const sanitizedTasks = result.tasks.map((task) =>
    sanitizeGeneratedTask(task, priorSteps)
  );

  // Guard against a concurrent generation for the same step.
  const tasks = await prisma.$transaction(async (tx) => {
    const existing = await tx.task.count({ where: { stepId: step.id } });
    if (existing > 0) return null;

    await tx.validationStep.update({
      where: { id: step.id },
      data: { laufmodus, basiertAufUmsetzungId },
    });

    await tx.task.createMany({
      data: sanitizedTasks.map((task, index) => ({
        stepId: step.id,
        title: task.title,
        hint: task.hint,
        annahmenBezugId: task.annahmenBezugId,
        erfolgskriterium: task.erfolgskriterium,
        herkunft: task.herkunft,
        erfuelltDurchUmsetzungId: task.erfuelltDurchUmsetzungId,
        done: task.herkunft === "BEREITS_ERFUELLT",
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

  return NextResponse.json(
    {
      tasks: tasksWithRefs,
      laufmodus,
      basiertAufUmsetzungId,
    },
    { status: 201 }
  );
}
