import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  DEMO_FIXTURE,
  type FixtureTask,
} from "@/scripts/demo-fixture-data";
import { DEMO_FAKE_AI_MODEL } from "@/lib/demo/constants";
import { demoDelay } from "@/lib/demo/delay";
import { DemoAiPreconditionError } from "@/lib/demo/fakeAi/phase3";
import { taskSelect } from "@/lib/tasks";
import {
  buildImplementationStatements,
  implementationStatementsById,
} from "@/lib/implementationStatements";
import { ACTIVE_ADOPTED_WHERE } from "@/lib/statementFilters";

export async function serveDemoTasks(stepId: string) {
  await demoDelay(700);

  const step = await prisma.validationStep.findUnique({
    where: { id: stepId },
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
      tasks: { select: { id: true } },
    },
  });

  if (!step) {
    throw new DemoAiPreconditionError(
      "Der Umsetzungsschritt wurde nicht gefunden."
    );
  }

  if (!step.adopted) {
    throw new DemoAiPreconditionError(
      "Aufgaben gibt es nur für übernommene Umsetzungsschritte. Übernimm den Schritt zuerst in Phase 4."
    );
  }

  if (step.tasks.length > 0) {
    throw new DemoAiConflictError("Für diesen Schritt existieren bereits Aufgaben.");
  }

  const fixtureStep = Object.values(DEMO_FIXTURE.validationSteps).find(
    (entry) => entry.title === step.title
  );
  if (!fixtureStep) {
    throw new DemoAiPreconditionError(
      "Für diesen Demo-Schrittschritt liegen keine vorbereiteten Aufgaben vor."
    );
  }

  const taskFixtures = fixtureStep.taskKeys
    .map((key) => DEMO_FIXTURE.tasks[key])
    .filter((task): task is FixtureTask => Boolean(task));

  const contentToStatementId = new Map<string, string>();
  for (const link of step.option.statements) {
    contentToStatementId.set(link.statement.content, link.statement.id);
  }

  const resolveAnnahmenBezugId = (key?: string) => {
    if (!key) return null;
    const fixture = DEMO_FIXTURE.statements[key];
    if (!fixture) return null;
    return contentToStatementId.get(fixture.content) ?? null;
  };

  let basiertAufUmsetzungId: string | null = step.basiertAufUmsetzungId;
  if (fixtureStep.basiertAufUmsetzungKey) {
    const baseFixture = DEMO_FIXTURE.validationSteps[fixtureStep.basiertAufUmsetzungKey];
    if (baseFixture) {
      const baseStep = await prisma.validationStep.findFirst({
        where: {
          optionId: step.optionId,
          title: baseFixture.title,
          adopted: true,
        },
        select: { id: true },
      });
      basiertAufUmsetzungId = baseStep?.id ?? basiertAufUmsetzungId;
    }
  }

  const tasks = await prisma.$transaction(async (tx) => {
    const existing = await tx.task.count({ where: { stepId: step.id } });
    if (existing > 0) return null;

    await tx.validationStep.update({
      where: { id: step.id },
      data: {
        laufmodus: fixtureStep.laufmodus ?? "EIGENSTAENDIG",
        basiertAufUmsetzungId,
      },
    });

    for (const fixture of taskFixtures) {
      const elaboration: FixtureTask["elaboration"] | undefined =
        fixture.elaboration;
      let elaborationJson: Prisma.InputJsonValue | undefined;
      if (elaboration) {
        elaborationJson = {
          ...elaboration,
          targeting: elaboration.targeting.vorhanden
            ? {
                ...elaboration.targeting,
                basiertAufAussageIds: elaboration.targeting.basiertAufAussageIds.map(
                  (key) => {
                    const stmt = DEMO_FIXTURE.statements[key];
                    if (!stmt) return key;
                    return contentToStatementId.get(stmt.content) ?? key;
                  }
                ),
              }
            : elaboration.targeting,
        } as Prisma.InputJsonValue;
      }

      await tx.task.create({
        data: {
          stepId: step.id,
          title: fixture.title,
          hint: fixture.hint ?? null,
          sortOrder: fixture.sortOrder,
          done: false,
          annahmenBezugId: resolveAnnahmenBezugId(fixture.annahmenBezugKey),
          erfolgskriterium: fixture.erfolgskriterium ?? null,
          herkunft: fixture.herkunft ?? "NEU",
          elaboration: elaborationJson,
          elaborationGeneratedAt: elaborationJson ? new Date() : null,
          elaborationModel: elaborationJson ? DEMO_FAKE_AI_MODEL : null,
        },
      });
    }

    return tx.task.findMany({
      where: { stepId: step.id },
      orderBy: { sortOrder: "asc" },
      select: taskSelect,
    });
  });

  if (!tasks) {
    throw new DemoAiConflictError("Für diesen Schritt existieren bereits Aufgaben.");
  }

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
  const statementMap = implementationStatementsById(adoptedStatements);

  return {
    tasks: tasks.map((task) => ({
      ...task,
      annahmenBezug: task.annahmenBezugId
        ? (statementMap.get(task.annahmenBezugId) ?? null)
        : null,
    })),
    laufmodus: fixtureStep.laufmodus ?? "EIGENSTAENDIG",
    basiertAufUmsetzungId,
  };
}

export async function serveDemoTaskElaboration(taskId: string) {
  await demoDelay(600);

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      step: {
        select: {
          title: true,
          project: { select: { name: true } },
        },
      },
    },
  });

  if (!task) {
    throw new DemoAiPreconditionError("Die Aufgabe wurde nicht gefunden.");
  }

  const fixtureTask = Object.values(DEMO_FIXTURE.tasks).find(
    (entry) => entry.title === task.title
  );
  const elaboration = fixtureTask?.elaboration;
  if (!elaboration) {
    throw new DemoAiPreconditionError(
      "Für diese Demo-Aufgabe liegt keine vorbereitete Ausarbeitung vor."
    );
  }

  const contentToStatementId = new Map<string, string>();
  const option = await prisma.validationStep.findFirst({
    where: { id: task.stepId },
    include: {
      option: {
        include: {
          statements: {
            include: { statement: { select: { id: true, content: true } } },
          },
        },
      },
    },
  });
  for (const link of option?.option.statements ?? []) {
    contentToStatementId.set(link.statement.content, link.statement.id);
  }

  const resolved = {
    ...elaboration,
    targeting: elaboration.targeting.vorhanden
      ? {
          ...elaboration.targeting,
          basiertAufAussageIds: elaboration.targeting.basiertAufAussageIds.map(
            (key) => {
              const stmt = DEMO_FIXTURE.statements[key];
              if (!stmt) return key;
              return contentToStatementId.get(stmt.content) ?? key;
            }
          ),
        }
      : elaboration.targeting,
  };

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      elaboration: resolved as Prisma.InputJsonValue,
      elaborationGeneratedAt: new Date(),
      elaborationModel: DEMO_FAKE_AI_MODEL,
    },
    select: {
      elaboration: true,
      elaborationGeneratedAt: true,
      elaborationModel: true,
    },
  });

  return {
    elaboration: resolved,
    generatedAt: updated.elaborationGeneratedAt,
    model: updated.elaborationModel,
    cached: false,
  };
}

export class DemoAiConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DemoAiConflictError";
  }
}

/** Resolve fixture feedback content for a demo validation step (by title). */
export function demoFeedbackContentForStepTitle(title: string): string | null {
  const fixtureStep = Object.values(DEMO_FIXTURE.validationSteps).find(
    (entry) => entry.title === title
  );
  if (!fixtureStep) return null;
  const feedback = Object.values(DEMO_FIXTURE.feedbacks).find(
    (entry) => entry.stepKey === fixtureStep.key
  );
  return feedback?.content ?? null;
}
