import type { Phase1StreamEvent } from "./events";
import { repairModuleOutput } from "./repair";
import type { Phase1AnalysisAnchor, Phase1ModuleValidationIssue } from "./types";
import type { Phase1ModuleKey } from "./types";

type EmitFn = (event: Phase1StreamEvent) => void;

export type ModuleRepairOutcome<T> = {
  data: T;
  repairCount: number;
  success: boolean;
};

export async function runModuleRepair<T>(options: {
  module: Phase1ModuleKey;
  anchor: Phase1AnalysisAnchor;
  invalidResult: unknown;
  issues: Phase1ModuleValidationIssue[];
  validParts?: unknown;
  immutableParts?: string[];
  signal?: AbortSignal;
  emit?: EmitFn;
  affectedItems?: string[];
}): Promise<ModuleRepairOutcome<T | null>> {
  options.emit?.({
    type: "module_repair_started",
    module: options.module,
    affectedItems: options.affectedItems ?? options.issues.map((i) => i.path),
  });

  const repaired = await repairModuleOutput<T>({
    module: options.module,
    anchor: options.anchor,
    invalidResult: options.invalidResult,
    issues: options.issues,
    validParts: options.validParts,
    immutableParts: options.immutableParts,
    signal: options.signal,
  });

  return {
    data: repaired.repaired,
    repairCount: repaired.repairCount,
    success: repaired.repaired !== null,
  };
}

export class Phase1ModuleError extends Error {
  readonly module: Phase1ModuleKey;
  readonly repairAttempted: boolean;

  constructor(module: Phase1ModuleKey, message: string, repairAttempted: boolean) {
    super(message);
    this.name = "Phase1ModuleError";
    this.module = module;
    this.repairAttempted = repairAttempted;
  }
}
