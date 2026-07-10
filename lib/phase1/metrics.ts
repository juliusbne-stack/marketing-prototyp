import type { Phase1ModuleKey } from "./types";

export type Phase1ModuleMetrics = {
  durationMs: number;
  inputTokens?: number;
  outputTokens?: number;
  cachedTokens?: number;
  repairCount: number;
  reused: boolean;
};

export type Phase1RunMetrics = {
  runId: string;
  projectId: string;
  mode: "initial" | "incremental";
  startedAt: number;
  completedAt?: number;
  totalDurationMs?: number;
  timeToFirstPreviewMs?: number;
  timeToFirstCompetitorMs?: number;
  anchorDurationMs?: number;
  synthesisDurationMs?: number;
  consistencyDurationMs?: number;
  persistenceDurationMs?: number;
  fallbackUsed: boolean;
  errorType?: string;
  modules: Partial<Record<Phase1ModuleKey, Phase1ModuleMetrics>>;
};

export function createPhase1RunMetrics(
  runId: string,
  projectId: string,
  mode: "initial" | "incremental"
): Phase1RunMetrics {
  return {
    runId,
    projectId,
    mode,
    startedAt: Date.now(),
    fallbackUsed: false,
    modules: {},
  };
}

export function recordModuleMetrics(
  metrics: Phase1RunMetrics,
  module: Phase1ModuleKey,
  data: Phase1ModuleMetrics
): void {
  metrics.modules[module] = data;
}

export function recordPreviewMetric(
  metrics: Phase1RunMetrics,
  kind: "firstPreview" | "firstCompetitor"
): void {
  const elapsed = Date.now() - metrics.startedAt;
  if (kind === "firstPreview" && metrics.timeToFirstPreviewMs === undefined) {
    metrics.timeToFirstPreviewMs = elapsed;
  }
  if (
    kind === "firstCompetitor" &&
    metrics.timeToFirstCompetitorMs === undefined
  ) {
    metrics.timeToFirstCompetitorMs = elapsed;
  }
}

export function finalizePhase1RunMetrics(
  metrics: Phase1RunMetrics,
  options?: { errorType?: string; fallbackUsed?: boolean }
): Phase1RunMetrics {
  metrics.completedAt = Date.now();
  metrics.totalDurationMs = metrics.completedAt - metrics.startedAt;
  if (options?.errorType) metrics.errorType = options.errorType;
  if (options?.fallbackUsed !== undefined) {
    metrics.fallbackUsed = options.fallbackUsed;
  }
  if (process.env.NODE_ENV !== "test") {
    console.info("[phase1-metrics]", JSON.stringify(metrics));
  }
  return metrics;
}
