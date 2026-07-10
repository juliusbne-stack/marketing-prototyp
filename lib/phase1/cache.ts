import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { phase1Config } from "./config";
import { PHASE1_CACHE_VERSIONS } from "./cacheVersions";
import {
  pestelModuleSchema,
  segmentsModuleSchema,
  resourcesModuleSchema,
  competitorsBatchSchema,
  synthesisModuleSchema,
  anchorSchema,
} from "@/lib/schemas/phase1/compact";
import type { Phase1ModuleKey } from "./types";
import { isRunCompleted } from "./runLock";
import { normalizeRunStatus } from "./fallback";

const MODULE_PAYLOAD_SCHEMAS: Partial<
  Record<Phase1ModuleKey, z.ZodType>
> = {
  anchor: anchorSchema,
  pestel: pestelModuleSchema,
  segments: segmentsModuleSchema,
  resources: resourcesModuleSchema,
  competitors_batch_1: competitorsBatchSchema,
  competitors_batch_2: competitorsBatchSchema,
  competitors_batch_3: competitorsBatchSchema,
  synthesis: synthesisModuleSchema,
};

function isPayloadSchemaValid(
  moduleKey: Phase1ModuleKey,
  payload: unknown
): boolean {
  const schema = MODULE_PAYLOAD_SCHEMAS[moduleKey];
  if (!schema) return true;
  return schema.safeParse(payload).success;
}

export async function loadCachedModule<T>(
  projectId: string,
  moduleKey: Phase1ModuleKey,
  inputHash: string
): Promise<T | null> {
  if (!phase1Config.moduleCache) return null;

  const entry = await prisma.phase1ModuleCache.findUnique({
    where: { projectId_moduleKey: { projectId, moduleKey } },
  });

  if (!entry || entry.inputHash !== inputHash || entry.status !== "valid") {
    return null;
  }

  const payload = entry.payload as Record<string, unknown>;
  const cachedVersion = payload.__cacheVersion as
    | typeof PHASE1_CACHE_VERSIONS
    | undefined;

  if (
    !cachedVersion ||
    cachedVersion.schemaVersion !== PHASE1_CACHE_VERSIONS.schemaVersion ||
    cachedVersion.moduleVersion !== PHASE1_CACHE_VERSIONS.moduleVersion ||
    cachedVersion.promptVersion !== PHASE1_CACHE_VERSIONS.promptVersion
  ) {
    return null;
  }

  const { __cacheVersion: _, ...modulePayload } = payload;
  if (!isPayloadSchemaValid(moduleKey, modulePayload)) {
    return null;
  }

  return modulePayload as T;
}

export async function saveCachedModule(
  projectId: string,
  moduleKey: Phase1ModuleKey,
  inputHash: string,
  payload: unknown
): Promise<void> {
  if (!phase1Config.moduleCache) return;

  const stored = {
    __cacheVersion: PHASE1_CACHE_VERSIONS,
    ...(payload as object),
  };

  await prisma.phase1ModuleCache.upsert({
    where: { projectId_moduleKey: { projectId, moduleKey } },
    create: {
      projectId,
      moduleKey,
      inputHash,
      payload: stored,
      status: "valid",
    },
    update: {
      inputHash,
      payload: stored,
      status: "valid",
    },
  });
}

export async function isRunFinalized(runId: string): Promise<boolean> {
  const run = await prisma.phase1Run.findUnique({ where: { runId } });
  if (!run) return false;
  return isRunCompleted(run.status);
}

export async function markRunStarted(
  projectId: string,
  runId: string
): Promise<void> {
  await prisma.phase1Run.upsert({
    where: { runId },
    create: { runId, projectId, status: "RUNNING" },
    update: { status: "RUNNING", finalizedAt: null },
  });
}

export async function markRunFinalized(runId: string): Promise<void> {
  await prisma.phase1Run.update({
    where: { runId },
    data: { status: "COMPLETED", finalizedAt: new Date() },
  });
}

export async function getRunStatus(runId: string): Promise<string | null> {
  const run = await prisma.phase1Run.findUnique({ where: { runId } });
  return run ? normalizeRunStatus(run.status) : null;
}
