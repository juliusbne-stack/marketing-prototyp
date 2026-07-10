import { describe, expect, it } from "vitest";
import {
  buildSegmentRepairTargets,
  buildResourceRepairTargets,
  buildCompetitorRepairTargets,
  buildSynthesisRepairTargets,
  buildConsistencyRepairTargets,
} from "./repairTargets";

describe("repair target builders", () => {
  it("builds segment replace target", () => {
    const targets = buildSegmentRepairTargets([
      { path: "segments.SMB", code: "ASPECTS", message: "missing aspects" },
    ]);
    expect(targets[0].type).toBe("ADD_MISSING_ASPECT");
  });

  it("builds resource missing category target", () => {
    const targets = buildResourceRepairTargets([
      { path: "statements", code: "COUNT", message: "too few" },
    ]);
    expect(targets[0].type).toBe("ADD_MISSING_CATEGORY");
  });

  it("builds competitor profile replace target", () => {
    const targets = buildCompetitorRepairTargets([
      { path: "profiles.comp-1", code: "ASPECTS", message: "incomplete" },
    ]);
    expect(targets[0].type).toBe("ADD_MISSING_ASPECT");
  });

  it("builds synthesis replace-all for many issues", () => {
    const targets = buildSynthesisRepairTargets([
      { path: "swot.SWOT_STRENGTH", code: "COUNT", message: "1" },
      { path: "swot.SWOT_WEAKNESS", code: "COUNT", message: "2" },
      { path: "swot.SWOT_OPPORTUNITY", code: "COUNT", message: "3" },
      { path: "swot.SWOT_THREAT", code: "COUNT", message: "4" },
    ]);
    expect(targets[0].type).toBe("REPLACE_ALL");
  });

  it("builds consistency repair targets with instructions", () => {
    const targets = buildConsistencyRepairTargets([
      {
        module: "pestel",
        objectId: "stmt-1",
        issueType: "CONTRADICTION",
        explanation: "conflict",
        repairInstruction: "fix content",
      },
    ]);
    expect(targets).toHaveLength(1);
    expect(targets[0].repairInstruction).toBe("fix content");
  });
});
