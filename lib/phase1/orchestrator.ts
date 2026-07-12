import { phase1Config } from "./config";
import {
  assertOnlyAdoptedStatementsUsedAsExistingContext,
  createPhase1ModuleHashes,
  loadPhase1Context,
} from "./context";
import { combinePhase1Outputs } from "./combine";
import { checkPhase1Consistency } from "./consistency";
import {
  Phase1ConsistencyError,
  getBlockingConsistencyErrors,
} from "./consistencyGate";
import {
  loadCachedModule,
  markRunStarted,
  saveCachedModule,
} from "./cache";
import {
  persistPhase1Atomically,
  markRunAborted,
  markRunFailed,
  markRunFallback,
} from "./persist";
import {
  runWithConcurrencyLimit,
  throwIfAborted,
  isAbortError,
  isTimeoutError,
} from "./concurrency";
import {
  createPhase1RunMetrics,
  finalizePhase1RunMetrics,
  recordModuleMetrics,
  recordPreviewMetric,
} from "./metrics";
import {
  generateAnchor,
  generateCompetitorsBatch,
  generatePestelModule,
  generateResourcesModule,
  generateSegmentsModule,
  generateSynthesis,
} from "./modules/generate";
import { runMonolithicPhase1 } from "./monolithic";
import {
  shouldUseMonolithicFallback,
  logFallbackDecision,
  type ModuleRepairResult,
} from "./fallback";
import { buildConsistencyRepairTargets } from "./repairTargets";
import { acquirePhase1RunLock } from "./runLock";
export { Phase1RunConflictError } from "./runLock";
import { Phase1ModuleError } from "./moduleRepair";
import type { Phase1Request, Phase1AnalysisAnchor } from "./types";
import type { Phase1StreamEvent } from "./events";
import { PHASE1_MODULE_LABELS } from "./events";
import type { Phase1ModuleKey } from "./types";
import type { Phase1Statement } from "@/lib/schemas/phase1";

const REQUIRED_MODULES: Phase1ModuleKey[] = [
  "pestel",
  "segments",
  "resources",
  "competitors_batch_1",
  "competitors_batch_2",
  "competitors_batch_3",
];

export async function runPhase1Analysis(request: Phase1Request) {
  const context = await loadPhase1Context(request.projectId);
  const metrics = createPhase1RunMetrics(
    context.runId,
    context.projectId,
    context.isIncremental ? "incremental" : "initial"
  );
  const repairResults: ModuleRepairResult[] = [];

  const emit = (event: Phase1StreamEvent) => {
    if (event.type === "statement") {
      recordPreviewMetric(metrics, "firstPreview");
      if (event.module.startsWith("competitors_")) {
        recordPreviewMetric(metrics, "firstCompetitor");
      }
    }
    request.emit?.(event);
  };

  emit({ type: "analysis_started", runId: context.runId });
  assertOnlyAdoptedStatementsUsedAsExistingContext(context);

  try {
    await acquirePhase1RunLock(context.projectId, context.runId);
    await markRunStarted(context.projectId, context.runId);
  } catch (error) {
    throw error;
  }

  let anchorStatus: "ok" | "failed" | "missing" = "missing";
  let synthesisStatus: "ok" | "failed" | "missing" | "not_started" = "not_started";
  let monolithicFallbackAttempted = false;

  if (!phase1Config.modularGeneration) {
    try {
      const result = await runMonolithicPhase1(context, request.signal, emit);
      finalizePhase1RunMetrics(metrics);
      return result;
    } catch (error) {
      if (isAbortError(error)) {
        await markRunAborted(context.runId);
        finalizePhase1RunMetrics(metrics, { errorType: "AbortError" });
      } else {
        await markRunFailed(context.runId);
        finalizePhase1RunMetrics(metrics, {
          errorType: error instanceof Error ? error.name : "unknown",
        });
      }
      throw error;
    }
  }

  try {
    const moduleHashes = createPhase1ModuleHashes(context);

    let anchor: Phase1AnalysisAnchor;
    try {
      const cachedAnchor = await loadCachedModule<Phase1AnalysisAnchor>(
        context.projectId,
        "anchor",
        moduleHashes.anchor
      );
      anchor =
        cachedAnchor ?? (await generateAnchor(context, request.signal, emit));

      if (!cachedAnchor) {
        await saveCachedModule(
          context.projectId,
          "anchor",
          moduleHashes.anchor,
          anchor
        );
      }
      anchorStatus = "ok";
    } catch (error) {
      anchorStatus = "failed";
      throw error;
    }

    type ModuleTaskResult = {
      module: Phase1ModuleKey;
      reused: boolean;
      repairCount?: number;
      updatedAnchor?: Phase1AnalysisAnchor;
    };

    const tasks: Array<{
      module: Phase1ModuleKey;
      run: () => Promise<ModuleTaskResult & Record<string, unknown>>;
    }> = [
      {
        module: "pestel",
        run: async () => runCachedOrGenerate(
          context, anchor, moduleHashes.pestel, "pestel",
          () => generatePestelModule(context, anchor, request.signal, emit),
          emit, request.signal
        ),
      },
      {
        module: "segments",
        run: async () => runCachedOrGenerate(
          context, anchor, moduleHashes.segments, "segments",
          () => generateSegmentsModule(context, anchor, request.signal, emit),
          emit, request.signal
        ),
      },
      {
        module: "resources",
        run: async () => runCachedOrGenerate(
          context, anchor, moduleHashes.resources, "resources",
          () => generateResourcesModule(context, anchor, request.signal, emit),
          emit, request.signal
        ),
      },
      ...([1, 2, 3] as const).map((batch) => ({
        module: `competitors_batch_${batch}` as Phase1ModuleKey,
        run: async () => {
          const moduleKey = `competitors_batch_${batch}` as Phase1ModuleKey;
          const cacheKey = `${moduleHashes.competitors}:${batch}`;
          emit({
            type: "module_started",
            module: moduleKey,
            label: PHASE1_MODULE_LABELS[moduleKey],
          });
          const cached = await loadCachedModule<{
            profileStatements: Phase1Statement[];
            landscapeStatements: Phase1Statement[];
          }>(context.projectId, moduleKey, cacheKey);
          if (cached) {
            emit({
              type: "module_completed",
              module: moduleKey,
              itemCount:
                cached.profileStatements.length +
                cached.landscapeStatements.length,
              reused: true,
            });
            return { module: moduleKey, reused: true, repairCount: 0, ...cached };
          }
          const result = await generateCompetitorsBatch(
            context,
            anchor,
            batch,
            request.signal,
            emit
          );
          await saveCachedModule(context.projectId, moduleKey, cacheKey, {
            profileStatements: result.profileStatements,
            landscapeStatements: result.landscapeStatements,
          });
          repairResults.push({
            module: moduleKey,
            success: true,
            repairAttempted: result.repairCount > 0,
            repairCount: result.repairCount,
          });
          recordModuleMetrics(metrics, moduleKey, {
            durationMs: result.durationMs,
            repairCount: result.repairCount,
            reused: false,
            inputTokens: result.usage.inputTokens,
            outputTokens: result.usage.outputTokens,
          });
          emit({
            type: "module_completed",
            module: moduleKey,
            itemCount:
              result.profileStatements.length +
              result.landscapeStatements.length,
            reused: false,
          });
          return {
            module: moduleKey,
            reused: false,
            updatedAnchor: result.updatedAnchor,
            profileStatements: result.profileStatements,
            landscapeStatements: result.landscapeStatements,
            repairCount: result.repairCount,
            usage: result.usage,
            durationMs: result.durationMs,
          };
        },
      })),
    ];

    const settled = await runWithConcurrencyLimit(
      tasks.map((task) => task.run),
      phase1Config.maxConcurrency,
      async (task) => task()
    );

    throwIfAborted(request.signal);

    for (const result of settled) {
      if (result.status === "rejected") {
        const reason = result.reason;
        if (reason instanceof Phase1ModuleError) {
          repairResults.push({
            module: reason.module,
            success: false,
            repairAttempted: reason.repairAttempted,
            repairCount: reason.repairAttempted ? 1 : 0,
          });
        }
        throw reason;
      }
      const value = result.value as ModuleTaskResult & { repairCount?: number };
      if (value.updatedAnchor) {
        anchor = value.updatedAnchor;
      }
      if (value.repairCount && value.repairCount > 0) {
        const existing = repairResults.find((r) => r.module === value.module);
        if (!existing) {
          repairResults.push({
            module: value.module,
            success: true,
            repairAttempted: true,
            repairCount: value.repairCount,
          });
        }
      }
    }

    const pestelResult = getSettledValue<{
      pestelRelevance: unknown;
      statements: Phase1Statement[];
    }>(settled[0]);
    const segmentsResult = getSettledValue<{
      segmentStatements: Phase1Statement[];
      customerProblems: Phase1Statement[];
    }>(settled[1]);
    const resourcesResult = getSettledValue<{ statements: Phase1Statement[] }>(
      settled[2]
    );
    const batch1 = getSettledValue<{
      profileStatements: Phase1Statement[];
      landscapeStatements: Phase1Statement[];
    }>(settled[3]);
    const batch2 = getSettledValue<{
      profileStatements: Phase1Statement[];
      landscapeStatements: Phase1Statement[];
    }>(settled[4]);
    const batch3 = getSettledValue<{
      profileStatements: Phase1Statement[];
      landscapeStatements: Phase1Statement[];
    }>(settled[5]);

    const competitorStatements = [
      ...batch1.profileStatements,
      ...batch2.profileStatements,
      ...batch3.profileStatements,
    ];
    const landscapeStatements = batch1.landscapeStatements;

    throwIfAborted(request.signal);

    const cachedSynthesis = await loadCachedModule<{
      swotStatements: Phase1Statement[];
      marketPathStatements: Phase1Statement[];
    }>(context.projectId, "synthesis", moduleHashes.synthesis);

    let synthesis: {
      swotStatements: Phase1Statement[];
      marketPathStatements: Phase1Statement[];
    };

    if (cachedSynthesis) {
      synthesis = cachedSynthesis;
      synthesisStatus = "ok";
    } else {
      try {
        synthesis = await generateSynthesis(
          context,
          anchor,
          {
            pestelStatements: pestelResult.statements,
            segmentStatements: segmentsResult.segmentStatements,
            customerProblems: segmentsResult.customerProblems,
            resourceStatements: resourcesResult.statements,
            competitorStatements,
          },
          request.signal,
          emit
        );
        await saveCachedModule(
          context.projectId,
          "synthesis",
          moduleHashes.synthesis,
          synthesis
        );
        synthesisStatus = "ok";
      } catch (error) {
        synthesisStatus = "failed";
        if (error instanceof Phase1ModuleError) {
          repairResults.push({
            module: "synthesis",
            success: false,
            repairAttempted: error.repairAttempted,
            repairCount: error.repairAttempted ? 1 : 0,
          });
        }
        throw error;
      }
    }

    const combined = combinePhase1Outputs({
      anchor,
      pestelRelevance: pestelResult.pestelRelevance as import("@/lib/schemas/phase1").PestelRelevance[],
      pestelStatements: pestelResult.statements,
      segmentStatements: segmentsResult.segmentStatements,
      customerProblems: segmentsResult.customerProblems,
      resourceStatements: resourcesResult.statements,
      competitorStatements,
      landscapeStatements,
      swotStatements: synthesis.swotStatements,
      marketPathStatements: synthesis.marketPathStatements,
    });

    const competitorLabels = new Set(
      competitorStatements
        .map((s) => s.competitorLabel?.trim())
        .filter((label): label is string => !!label)
    );

    throwIfAborted(request.signal);
    emit({ type: "consistency_check_started" });
    const consistencyResult = await checkPhase1Consistency({
      anchor,
      statements: combined,
      competitorLabels,
      targetCompetitorCount: context.targetCompetitorCount,
      signal: request.signal,
    });

    const blockingErrors = getBlockingConsistencyErrors(consistencyResult);
    const warnings = consistencyResult.issues.filter(
      (i) => i.severity === "WARNING"
    );

    if (warnings.length > 0) {
      emit({
        type: "warning",
        message: `${warnings.length} Konsistenz-Hinweis${warnings.length === 1 ? "" : "e"} — Speicherung nicht blockiert.`,
      });
    }

    if (blockingErrors.length > 0) {
      const repairable = buildConsistencyRepairTargets(blockingErrors);
      if (repairable.length > 0) {
        emit({
          type: "warning",
          message: `${repairable.length} reparierbare Konsistenzfehler erkannt (noch nicht automatisch repariert).`,
        });
      }

      if (phase1Config.monolithicFallback) {
        logFallbackDecision({
          runId: context.runId,
          projectId: context.projectId,
          fallbackReason: `${blockingErrors.length} ungelöste Konsistenzfehler (ERROR)`,
          attemptedRepairs: repairResults,
          timestamp: new Date().toISOString(),
        });
        monolithicFallbackAttempted = true;
        await markRunFallback(context.runId);
        emit({
          type: "warning",
          message:
            "Konsistenzfehler — monolithischer Fallback wird verwendet.",
        });
        metrics.fallbackUsed = true;
        const fallback = await runMonolithicPhase1(
          context,
          request.signal,
          emit
        );
        finalizePhase1RunMetrics(metrics, { fallbackUsed: true });
        return fallback;
      }

      await markRunFailed(context.runId);
      const message = `${blockingErrors.length} Konsistenzfehler — Analyse wurde nicht gespeichert.`;
      emit({ type: "error", recoverable: true, message });
      finalizePhase1RunMetrics(metrics, { errorType: "ConsistencyError" });
      throw new Phase1ConsistencyError(message, blockingErrors);
    }

    throwIfAborted(request.signal);
    emit({ type: "persisting" });

    const persisted = await persistPhase1Atomically({
      runId: context.runId,
      projectId: context.projectId,
      statements: combined,
      pestelRelevance: pestelResult.pestelRelevance,
      adoptedAnalysis: context.adoptedAnalysis,
      isIncremental: context.isIncremental,
    });

    emit({ type: "final", data: persisted });
    finalizePhase1RunMetrics(metrics);
    return persisted;
  } catch (error) {
    if (isAbortError(error)) {
      await markRunAborted(context.runId);
      finalizePhase1RunMetrics(metrics, { errorType: "AbortError" });
      throw error;
    }

    if (isTimeoutError(error)) {
      const moduleError = error instanceof Phase1ModuleError
        ? error
        : new Phase1ModuleError("pestel", error instanceof Error ? error.message : "Timeout", false);
      repairResults.push({
        module: moduleError.module,
        success: false,
        repairAttempted: false,
        repairCount: 0,
      });
    }

    const fallbackDecision = shouldUseMonolithicFallback({
      anchorStatus,
      requiredModules: REQUIRED_MODULES,
      repairResults,
      synthesisStatus,
      fatalTechnicalError: !(error instanceof Phase1ModuleError) && !isTimeoutError(error),
      structuredOutputsUnavailable:
        error instanceof Error && error.message.includes("structured"),
    });

    if (
      phase1Config.monolithicFallback &&
      fallbackDecision.useFallback &&
      !monolithicFallbackAttempted
    ) {
      logFallbackDecision({
        runId: context.runId,
        projectId: context.projectId,
        fallbackReason: fallbackDecision.reason ?? "Unbekannt",
        failedModule: fallbackDecision.failedModule,
        attemptedRepairs: repairResults,
        timestamp: new Date().toISOString(),
      });
      monolithicFallbackAttempted = true;
      await markRunFallback(context.runId);
      emit({
        type: "warning",
        message: "Modulare Analyse fehlgeschlagen — monolithischer Fallback wird verwendet.",
      });
      metrics.fallbackUsed = true;
      try {
        const fallback = await runMonolithicPhase1(
          context,
          request.signal,
          emit
        );
        finalizePhase1RunMetrics(metrics, { fallbackUsed: true });
        return fallback;
      } catch (fallbackError) {
        if (isAbortError(fallbackError)) {
          await markRunAborted(context.runId);
          finalizePhase1RunMetrics(metrics, {
            fallbackUsed: true,
            errorType: "AbortError",
          });
        } else {
          await markRunFailed(context.runId);
          finalizePhase1RunMetrics(metrics, {
            fallbackUsed: true,
            errorType:
              fallbackError instanceof Error ? fallbackError.name : "unknown",
          });
        }
        throw fallbackError;
      }
    }

    await markRunFailed(context.runId);
    finalizePhase1RunMetrics(metrics, {
      errorType: error instanceof Error ? error.name : "unknown",
    });
    throw error;
  }
}

async function runCachedOrGenerate<T extends Record<string, unknown>>(
  context: import("./types").Phase1Context,
  anchor: Phase1AnalysisAnchor,
  hash: string,
  module: Phase1ModuleKey,
  generate: () => Promise<T & { repairCount?: number; durationMs?: number; usage?: { inputTokens?: number; outputTokens?: number } }>,
  emit: (event: Phase1StreamEvent) => void,
  signal?: AbortSignal
): Promise<{ module: Phase1ModuleKey; reused: boolean } & T> {
  emit({
    type: "module_started",
    module,
    label: PHASE1_MODULE_LABELS[module],
  });
  const cached = await loadCachedModule<T>(context.projectId, module, hash);
  if (cached) {
    const itemCount = countModuleItems(cached);
    emit({
      type: "module_completed",
      module,
      itemCount,
      reused: true,
    });
    return { module, reused: true, repairCount: 0, ...cached };
  }
  throwIfAborted(signal);
  const result = await generate();
  await saveCachedModule(context.projectId, module, hash, result);
  const itemCount = countModuleItems(result);
  emit({
    type: "module_completed",
    module,
    itemCount,
    reused: false,
  });
  return { module, reused: false, ...result };
}

function countModuleItems(data: Record<string, unknown>): number {
  if (Array.isArray(data.statements)) return data.statements.length;
  const segments = Array.isArray(data.segmentStatements) ? data.segmentStatements.length : 0;
  const problems = Array.isArray(data.customerProblems) ? data.customerProblems.length : 0;
  return segments + problems;
}

function getSettledValue<T>(result: PromiseSettledResult<unknown>): T {
  if (result.status === "rejected") {
    throw result.reason;
  }
  return result.value as T;
}
