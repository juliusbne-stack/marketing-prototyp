import { prisma } from "@/lib/prisma";
import { phase1Config } from "./config";
import {
  isTerminalRunStatus,
  normalizeRunStatus,
  type Phase1RunStatus,
} from "./fallback";

export class Phase1RunConflictError extends Error {
  readonly activeRunId: string;

  constructor(activeRunId: string) {
    super(
      `Ein Phase-1-Lauf ist bereits aktiv (runId=${activeRunId}). Bitte warten oder abbrechen.`
    );
    this.name = "Phase1RunConflictError";
    this.activeRunId = activeRunId;
  }
}

export async function resolveStaleRuns(projectId: string): Promise<void> {
  const staleBefore = new Date(Date.now() - phase1Config.runStaleAfterMs);
  await prisma.phase1Run.updateMany({
    where: {
      projectId,
      status: { in: ["RUNNING", "started", "FALLBACK"] },
      createdAt: { lt: staleBefore },
    },
    data: { status: "FAILED" },
  });
}

export async function acquirePhase1RunLock(
  projectId: string,
  runId: string
): Promise<void> {
  await resolveStaleRuns(projectId);

  const active = await prisma.phase1Run.findFirst({
    where: {
      projectId,
      status: { in: ["RUNNING", "started", "FALLBACK"] },
      NOT: { runId },
    },
    orderBy: { createdAt: "desc" },
  });

  if (active) {
    throw new Phase1RunConflictError(active.runId);
  }
}

export async function markRunStatus(
  runId: string,
  status: Phase1RunStatus,
  options?: { finalizedAt?: Date }
): Promise<void> {
  await prisma.phase1Run.update({
    where: { runId },
    data: {
      status,
      ...(options?.finalizedAt ? { finalizedAt: options.finalizedAt } : {}),
    },
  });
}

export async function getActiveRunForProject(
  projectId: string
): Promise<{ runId: string; status: Phase1RunStatus } | null> {
  const run = await prisma.phase1Run.findFirst({
    where: {
      projectId,
      status: { in: ["RUNNING", "started", "FALLBACK"] },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!run) return null;
  return { runId: run.runId, status: normalizeRunStatus(run.status) };
}

export function isRunActive(status: string): boolean {
  const normalized = normalizeRunStatus(status);
  return normalized === "RUNNING" || normalized === "FALLBACK";
}

export function isRunCompleted(status: string): boolean {
  return normalizeRunStatus(status) === "COMPLETED";
}

export function isRunFinalized(status: string): boolean {
  return isTerminalRunStatus(status) || normalizeRunStatus(status) === "COMPLETED";
}
