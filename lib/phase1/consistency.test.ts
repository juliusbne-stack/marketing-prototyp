import { describe, expect, it } from "vitest";
import {
  getBlockingConsistencyErrors,
  hasBlockingConsistencyErrors,
  Phase1ConsistencyError,
} from "./consistencyGate";
import type { ConsistencyCheckResult } from "./types";

describe("consistency gate", () => {
  it("WARNING does not block persistence", () => {
    const result: ConsistencyCheckResult = {
      isConsistent: false,
      issues: [
        {
          severity: "WARNING",
          module: "pestel",
          issueType: "MILD",
          explanation: "minor mismatch",
        },
      ],
    };
    expect(hasBlockingConsistencyErrors(result)).toBe(false);
    expect(getBlockingConsistencyErrors(result)).toHaveLength(0);
  });

  it("ERROR blocks persistence", () => {
    const result: ConsistencyCheckResult = {
      isConsistent: false,
      issues: [
        {
          severity: "ERROR",
          module: "segments",
          issueType: "CONTRADICTION",
          explanation: "conflict",
        },
      ],
    };
    expect(hasBlockingConsistencyErrors(result)).toBe(true);
    expect(getBlockingConsistencyErrors(result)).toHaveLength(1);
  });

  it("mixed WARNING and ERROR only ERROR blocks", () => {
    const result: ConsistencyCheckResult = {
      isConsistent: false,
      issues: [
        {
          severity: "WARNING",
          module: "pestel",
          issueType: "MILD",
          explanation: "hint",
        },
        {
          severity: "ERROR",
          module: "synthesis",
          issueType: "CONTRADICTION",
          explanation: "conflict",
        },
      ],
    };
    expect(getBlockingConsistencyErrors(result)).toHaveLength(1);
    expect(getBlockingConsistencyErrors(result)[0].severity).toBe("ERROR");
  });

  it("Phase1ConsistencyError carries issues", () => {
    const issues = [
      {
        severity: "ERROR" as const,
        module: "pestel",
        issueType: "X",
        explanation: "y",
      },
    ];
    const err = new Phase1ConsistencyError("blocked", issues);
    expect(err.name).toBe("Phase1ConsistencyError");
    expect(err.issues).toEqual(issues);
  });
});
