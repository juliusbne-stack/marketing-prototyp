import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { filterDuplicateStatements } from "@/lib/statementDedup";
import type { Phase1Statement, PestelRelevance } from "@/lib/schemas/phase1";
import type { AdoptedContextStatement } from "./types";
import { isRunFinalized } from "./cache";
import { markRunStatus } from "./runLock";

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

export type PersistedPhase1Result = {
  statements: Prisma.StatementGetPayload<{ select: typeof statementSelect }>[];
  pestelRelevance: PestelRelevance[];
  incremental: boolean;
  filteredDuplicateCount: number;
};

export class Phase1PersistenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Phase1PersistenceError";
  }
}

export async function persistPhase1Atomically(options: {
  runId: string;
  projectId: string;
  statements: Phase1Statement[];
  pestelRelevance: unknown;
  adoptedAnalysis: AdoptedContextStatement[];
  isIncremental: boolean;
}): Promise<PersistedPhase1Result> {
  if (await isRunFinalized(options.runId)) {
    const existing = await prisma.statement.findMany({
      where: { projectId: options.projectId, phase: 1 },
      orderBy: { createdAt: "asc" },
      select: statementSelect,
    });
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: options.projectId },
    });
    return {
      statements: existing,
      pestelRelevance: (project.pestelRelevance ?? []) as PestelRelevance[],
      incremental: options.isIncremental,
      filteredDuplicateCount: 0,
    };
  }

  const { kept: newStatements, filtered: filteredDuplicates } =
    filterDuplicateStatements<Phase1Statement>(
      options.statements,
      options.adoptedAnalysis
    );

  const result = await prisma.$transaction(async (tx) => {
    const run = await tx.phase1Run.findUnique({ where: { runId: options.runId } });
    if (run?.status === "COMPLETED" || run?.status === "finalized") {
      const existing = await tx.statement.findMany({
        where: { projectId: options.projectId, phase: 1 },
        orderBy: { createdAt: "asc" },
        select: statementSelect,
      });
      const project = await tx.project.findUniqueOrThrow({
        where: { id: options.projectId },
      });
      return {
        statements: existing,
        pestelRelevance: (project.pestelRelevance ?? []) as PestelRelevance[],
        alreadyFinalized: true,
      };
    }

    await tx.statement.deleteMany({
      where: { projectId: options.projectId, phase: 1, adopted: false },
    });

    if (newStatements.length > 0) {
      await tx.statement.createMany({
        data: newStatements.map((statement) => ({
          projectId: options.projectId,
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
      where: { id: options.projectId },
      data: {
        pestelRelevance: options.pestelRelevance as Prisma.InputJsonValue,
      },
    });

    await tx.phase1Run.update({
      where: { runId: options.runId },
      data: { status: "COMPLETED", finalizedAt: new Date() },
    });

    const savedStatements = await tx.statement.findMany({
      where: { projectId: options.projectId, phase: 1 },
      orderBy: { createdAt: "asc" },
      select: statementSelect,
    });

    return {
      statements: savedStatements,
      pestelRelevance: options.pestelRelevance as PestelRelevance[],
      alreadyFinalized: false,
    };
  });

  return {
    statements: result.statements,
    pestelRelevance: result.pestelRelevance,
    incremental: options.isIncremental,
    filteredDuplicateCount: filteredDuplicates.length,
  };
}

export async function markRunAborted(runId: string): Promise<void> {
  await markRunStatus(runId, "ABORTED", { finalizedAt: new Date() });
}

export async function markRunFailed(runId: string): Promise<void> {
  await markRunStatus(runId, "FAILED", { finalizedAt: new Date() });
}

export async function markRunFallback(runId: string): Promise<void> {
  await markRunStatus(runId, "FALLBACK");
}
