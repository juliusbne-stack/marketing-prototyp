/** Bump when module schema, prompt, or output shape changes to invalidate stale cache hits. */
export const PHASE1_CACHE_VERSIONS = {
  moduleVersion: "phase1-modules-v2",
  promptVersion: "2026-07-stabilization-1",
  schemaVersion: "compact-v2",
} as const;

export type Phase1CacheVersionInput = typeof PHASE1_CACHE_VERSIONS;
