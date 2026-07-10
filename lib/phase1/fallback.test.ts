import { describe, expect, it } from "vitest";
import { shouldUseMonolithicFallback } from "./fallback";
import type { Phase1ModuleKey } from "./types";

const REQUIRED: Phase1ModuleKey[] = [
  "pestel",
  "segments",
  "resources",
  "competitors_batch_1",
  "competitors_batch_2",
  "competitors_batch_3",
];

describe("shouldUseMonolithicFallback", () => {
  it("does not fallback for single repairable module error without repair attempt", () => {
    const result = shouldUseMonolithicFallback({
      anchorStatus: "ok",
      requiredModules: REQUIRED,
      repairResults: [
        {
          module: "pestel",
          success: false,
          repairAttempted: false,
          repairCount: 0,
        },
      ],
      synthesisStatus: "ok",
    });
    expect(result.useFallback).toBe(false);
  });

  it("fallbacks when anchor failed", () => {
    const result = shouldUseMonolithicFallback({
      anchorStatus: "failed",
      requiredModules: REQUIRED,
      repairResults: [],
      synthesisStatus: "not_started",
    });
    expect(result.useFallback).toBe(true);
    expect(result.failedModule).toBe("anchor");
  });

  it("fallbacks when required module failed after repair", () => {
    const result = shouldUseMonolithicFallback({
      anchorStatus: "ok",
      requiredModules: REQUIRED,
      repairResults: [
        {
          module: "segments",
          success: false,
          repairAttempted: true,
          repairCount: 1,
        },
      ],
      synthesisStatus: "ok",
    });
    expect(result.useFallback).toBe(true);
    expect(result.failedModule).toBe("segments");
  });

  it("does not fallback for synthesis failure without repair attempt", () => {
    const result = shouldUseMonolithicFallback({
      anchorStatus: "ok",
      requiredModules: REQUIRED,
      repairResults: [],
      synthesisStatus: "failed",
    });
    expect(result.useFallback).toBe(false);
  });

  it("fallbacks on fatal technical error", () => {
    const result = shouldUseMonolithicFallback({
      anchorStatus: "ok",
      requiredModules: REQUIRED,
      repairResults: [],
      synthesisStatus: "ok",
      fatalTechnicalError: true,
    });
    expect(result.useFallback).toBe(true);
  });

  it("fallbacks when structured outputs unavailable", () => {
    const result = shouldUseMonolithicFallback({
      anchorStatus: "ok",
      requiredModules: REQUIRED,
      repairResults: [],
      synthesisStatus: "ok",
      structuredOutputsUnavailable: true,
    });
    expect(result.useFallback).toBe(true);
  });
});
