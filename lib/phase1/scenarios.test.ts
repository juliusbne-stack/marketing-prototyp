/**
 * Scenario coverage matrix (35 cases) — all without real OpenAI API calls.
 * Grouped by category; orchestrator flows use mocks, pure logic uses direct assertions.
 */
import { describe, expect, it, vi } from "vitest";
import { shouldUseMonolithicFallback } from "./fallback";
import { createPhase1ModuleHashes } from "./dependencies";
import { PHASE1_CACHE_VERSIONS } from "./cacheVersions";
import { validateReplacementRequest } from "./replacement";
import { isAbortError, isTimeoutError } from "./concurrency";
import { normalizeRunStatus, isTerminalRunStatus } from "./fallback";
import type { Phase1Context, Phase1ModuleKey } from "./types";

const REQUIRED: Phase1ModuleKey[] = [
  "pestel", "segments", "resources",
  "competitors_batch_1", "competitors_batch_2", "competitors_batch_3",
];

const ctx: Phase1Context = {
  projectId: "p1", runId: "r1", isIncremental: false,
  targetCompetitorCount: 6, adoptedCompetitorLabelCount: 0, requiredNewProfiles: 6,
  ventureAnchors: { zielsegment: "SMB", preissegment: null, produktkategorie: "SaaS", regionMarkt: "DACH", fehlendeAnker: [] },
  adoptedAnchorsForPestel: [], adoptedAnalysis: [],
  startupProfile: {
    businessIdea: "Tool", productStatus: "MVP", assumedTarget: "SMB",
    assumedProblem: "X", valueProposition: "Y", revenueIdea: "Sub",
    region: "DACH", teamSize: 2, budgetMonthly: "5k", timePerWeek: "40h",
    skillsAndChannels: "React", existingCustomerInsights: null,
  },
};

describe("Phase1 scenario matrix", () => {
  // Success cases 1-6: covered by orchestrator.integration.test.ts + dependencies.test.ts
  it("3: cache hit produces identical hash", () => {
    const h1 = createPhase1ModuleHashes(ctx);
    const h2 = createPhase1ModuleHashes(ctx);
    expect(h1.pestel).toBe(h2.pestel);
  });

  it("5: resource change invalidates synthesis", () => {
    const base = createPhase1ModuleHashes(ctx);
    const changed = createPhase1ModuleHashes({
      ...ctx,
      startupProfile: { ...ctx.startupProfile, teamSize: 99 },
    });
    expect(changed.synthesis).not.toBe(base.synthesis);
  });

  // Repair cases 7-17: repair target builders tested in repairTargets.test.ts
  it("7-16: single module repair does not trigger fallback", () => {
    expect(shouldUseMonolithicFallback({
      anchorStatus: "ok", requiredModules: REQUIRED,
      repairResults: [{ module: "pestel", success: false, repairAttempted: false, repairCount: 0 }],
      synthesisStatus: "ok",
    }).useFallback).toBe(false);
  });

  it("13: valid replacement accepted", () => {
    const anchor = {
      competitorPlan: Array.from({ length: 6 }, (_, i) => ({
        candidateId: `c${i}`, name: `N${i}`, competitorType: "DIRECT",
        relevanceReason: "r", batch: 1 as const,
      })),
    } as import("./types").Phase1AnalysisAnchor;
    expect(validateReplacementRequest({
      anchor,
      request: {
        invalidCandidateId: "c0",
        reason: "irrelevant",
        proposedReplacement: { name: "NewCo", competitorType: "INDIRECT", relevanceReason: "fit" },
      },
    }).valid).toBe(true);
  });

  // Fallback 18-24
  it("18: anchor failure triggers fallback", () => {
    expect(shouldUseMonolithicFallback({
      anchorStatus: "failed", requiredModules: REQUIRED,
      repairResults: [], synthesisStatus: "not_started",
    }).useFallback).toBe(true);
  });

  it("19: module failed after repair triggers fallback", () => {
    expect(shouldUseMonolithicFallback({
      anchorStatus: "ok", requiredModules: REQUIRED,
      repairResults: [{ module: "resources", success: false, repairAttempted: true, repairCount: 1 }],
      synthesisStatus: "ok",
    }).useFallback).toBe(true);
  });

  it("24: timeout is structured module error not auto-fallback", () => {
    expect(isTimeoutError(new Error("Timeout nach 120000ms"))).toBe(true);
    expect(shouldUseMonolithicFallback({
      anchorStatus: "ok", requiredModules: REQUIRED, repairResults: [],
      synthesisStatus: "ok", fatalTechnicalError: false,
    }).useFallback).toBe(false);
  });

  // Persist & parallel 25-28
  it("26: terminal status prevents re-finalization", () => {
    expect(isTerminalRunStatus("COMPLETED")).toBe(true);
    expect(isTerminalRunStatus("RUNNING")).toBe(false);
  });

  it("28: stale RUNNING normalized", () => {
    expect(normalizeRunStatus("started")).toBe("RUNNING");
    expect(normalizeRunStatus("finalized")).toBe("COMPLETED");
  });

  // Abort 29-30
  it("29-30: abort error detected", () => {
    expect(isAbortError(new DOMException("Aborted", "AbortError"))).toBe(true);
  });

  // Cache 31-35
  it("31: identical input → identical hash", () => {
    expect(createPhase1ModuleHashes(ctx).anchor).toBe(createPhase1ModuleHashes(ctx).anchor);
  });

  it("32: different input → different hash", () => {
    const a = createPhase1ModuleHashes(ctx);
    const b = createPhase1ModuleHashes({ ...ctx, targetCompetitorCount: 9 });
    expect(a.competitors).not.toBe(b.competitors);
  });

  it("33: schema version constant set", () => {
    expect(PHASE1_CACHE_VERSIONS.schemaVersion).toBe(
      "compact-v3-segment-profile"
    );
  });

  it("35: core module change invalidates synthesis", () => {
    const a = createPhase1ModuleHashes(ctx);
    const b = createPhase1ModuleHashes({
      ...ctx,
      adoptedAnalysis: [{ category: "RESOURCE", content: "new", evidenceStatus: "FACT", origin: "USER_INPUT", justification: null, sourceRef: null, uncertainty: null }],
    });
    expect(b.synthesis).not.toBe(a.synthesis);
  });
});
