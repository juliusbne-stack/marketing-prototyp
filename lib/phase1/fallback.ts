import type { Phase1ModuleKey } from "./types";

export type Phase1RunStatus =
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "ABORTED"
  | "FALLBACK";

export const TERMINAL_RUN_STATUSES: Phase1RunStatus[] = [
  "COMPLETED",
  "FAILED",
  "ABORTED",
];

export type ModuleRepairResult = {
  module: Phase1ModuleKey;
  success: boolean;
  repairAttempted: boolean;
  repairCount: number;
};

export type FallbackDecisionInput = {
  anchorStatus: "ok" | "failed" | "missing";
  requiredModules: Phase1ModuleKey[];
  repairResults: ModuleRepairResult[];
  synthesisStatus: "ok" | "failed" | "missing" | "not_started";
  fatalTechnicalError?: boolean;
  structuredOutputsUnavailable?: boolean;
};

export type FallbackLogEntry = {
  runId: string;
  projectId: string;
  fallbackReason: string;
  failedModule?: Phase1ModuleKey;
  attemptedRepairs: ModuleRepairResult[];
  timestamp: string;
};

export function shouldUseMonolithicFallback(
  input: FallbackDecisionInput
): { useFallback: boolean; reason?: string; failedModule?: Phase1ModuleKey } {
  if (input.fatalTechnicalError) {
    return {
      useFallback: true,
      reason: "Unerwarteter fataler Fehler in der modularen Orchestrierung.",
    };
  }

  if (input.structuredOutputsUnavailable) {
    return {
      useFallback: true,
      reason: "Structured Outputs oder SDK technisch nicht nutzbar.",
    };
  }

  if (input.anchorStatus === "missing" || input.anchorStatus === "failed") {
    return {
      useFallback: true,
      reason: "Analyseanker fehlt endgültig.",
      failedModule: "anchor",
    };
  }

  const failedRequired = input.repairResults.filter(
    (r) =>
      input.requiredModules.includes(r.module) &&
      !r.success &&
      r.repairAttempted
  );
  if (failedRequired.length > 0) {
    return {
      useFallback: true,
      reason: `Pflichtmodul ${failedRequired[0].module} bleibt trotz gezielter Reparatur unbrauchbar.`,
      failedModule: failedRequired[0].module,
    };
  }

  const failedSynthesis = input.repairResults.find(
    (r) => r.module === "synthesis" && r.repairAttempted && !r.success
  );
  if (input.synthesisStatus === "failed" && failedSynthesis) {
    return {
      useFallback: true,
      reason: "Synthese bleibt trotz gezielter Reparatur vollständig unbrauchbar.",
      failedModule: "synthesis",
    };
  }

  return { useFallback: false };
}

export function logFallbackDecision(entry: FallbackLogEntry): void {
  if (process.env.NODE_ENV !== "test") {
    console.warn("[phase1-fallback]", JSON.stringify(entry));
  }
}

/** Map legacy DB status values to canonical run status. */
export function normalizeRunStatus(status: string): Phase1RunStatus {
  switch (status) {
    case "started":
      return "RUNNING";
    case "finalized":
      return "COMPLETED";
    case "RUNNING":
    case "COMPLETED":
    case "FAILED":
    case "ABORTED":
    case "FALLBACK":
      return status;
    default:
      return "FAILED";
  }
}

export function isTerminalRunStatus(status: string): boolean {
  return TERMINAL_RUN_STATUSES.includes(normalizeRunStatus(status));
}
