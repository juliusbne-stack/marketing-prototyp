/** Bump when module schema, prompt, or output shape changes to invalidate stale cache hits. */
export const PHASE1_CACHE_VERSIONS = {
  moduleVersion: "phase1-modules-v3",
  promptVersion: "2026-07-segment-profile-1",
  schemaVersion: "compact-v3-segment-profile",
} as const;

export type Phase1CacheVersionInput = typeof PHASE1_CACHE_VERSIONS;
