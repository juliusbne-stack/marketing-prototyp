import type { ConsistencyCheckResult } from "./types";

export type ConsistencyIssue = ConsistencyCheckResult["issues"][number];

export class Phase1ConsistencyError extends Error {
  readonly issues: ConsistencyIssue[];

  constructor(message: string, issues: ConsistencyIssue[]) {
    super(message);
    this.name = "Phase1ConsistencyError";
    this.issues = issues;
  }
}

/** Only ERROR-severity issues block persistence; WARNING does not. */
export function getBlockingConsistencyErrors(
  result: ConsistencyCheckResult
): ConsistencyIssue[] {
  return result.issues.filter((issue) => issue.severity === "ERROR");
}

export function hasBlockingConsistencyErrors(
  result: ConsistencyCheckResult
): boolean {
  return getBlockingConsistencyErrors(result).length > 0;
}
