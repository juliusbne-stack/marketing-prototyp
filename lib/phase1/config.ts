import type { Phase1ModelConfig } from "./modelConfig";

const DEFAULT_MODEL = "gpt-4o";

function envFlag(name: string, defaultValue: boolean): boolean {
  const value = process.env[name];
  if (value === undefined || value === "") return defaultValue;
  return value === "true" || value === "1";
}

function envInt(name: string, defaultValue: number): number {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

export const phase1Config = {
  modularGeneration: envFlag("PHASE1_MODULAR_GENERATION", true),
  moduleCache: envFlag("PHASE1_MODULE_CACHE", true),
  structuredOutputs: envFlag("PHASE1_STRUCTURED_OUTPUTS", true),
  monolithicFallback: envFlag("PHASE1_MONOLITHIC_FALLBACK", true),
  consistencyCheck: envFlag("PHASE1_CONSISTENCY_CHECK", true),
  maxConcurrency: envInt("PHASE1_MAX_CONCURRENCY", 4),
  moduleTimeoutMs: envInt("PHASE1_MODULE_TIMEOUT_MS", 120_000),
  synthesisTimeoutMs: envInt("PHASE1_SYNTHESIS_TIMEOUT_MS", 120_000),
  consistencyTimeoutMs: envInt("PHASE1_CONSISTENCY_TIMEOUT_MS", 60_000),
  runStaleAfterMs: envInt("PHASE1_RUN_STALE_AFTER_MS", 900_000),
  maxTokens: envInt("PHASE1_MAX_TOKENS", 16_384),
  serviceTier: process.env.PHASE1_SERVICE_TIER?.trim() || undefined,
  models: {
    anchor: process.env.PHASE1_MODEL_ANCHOR?.trim() || DEFAULT_MODEL,
    pestel: process.env.PHASE1_MODEL_PESTEL?.trim() || DEFAULT_MODEL,
    segments: process.env.PHASE1_MODEL_SEGMENTS?.trim() || DEFAULT_MODEL,
    resources: process.env.PHASE1_MODEL_RESOURCES?.trim() || DEFAULT_MODEL,
    competitors: process.env.PHASE1_MODEL_COMPETITORS?.trim() || DEFAULT_MODEL,
    synthesis: process.env.PHASE1_MODEL_SYNTHESIS?.trim() || DEFAULT_MODEL,
    repair: process.env.PHASE1_MODEL_REPAIR?.trim() || DEFAULT_MODEL,
    consistency: process.env.PHASE1_MODEL_CONSISTENCY?.trim() || DEFAULT_MODEL,
  } satisfies Phase1ModelConfig,
};
