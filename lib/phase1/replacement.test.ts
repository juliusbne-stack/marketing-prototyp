import { describe, expect, it } from "vitest";
import {
  applyReplacementToAnchor,
  validateReplacementRequest,
} from "./replacement";
import type { Phase1AnalysisAnchor } from "./types";

function makeAnchor(count = 6): Phase1AnalysisAnchor {
  return {
    marketScope: {
      definition: "B2B SaaS",
      geography: "DACH",
      marketStage: "growth",
      relevantBoundaries: ["SMB"],
      excludedBoundaries: [],
    },
    businessModelCore: {
      offer: "Tool",
      primaryCustomer: "SMB",
      userRoles: ["user"],
      buyerRoles: ["buyer"],
      payerRoles: ["payer"],
      coreProblem: "problem",
      coreBenefit: "benefit",
      revenueLogic: "subscription",
    },
    startupContext: {
      productStage: "MVP",
      teamSituation: "small",
      budgetSituation: "limited",
      capabilityConstraints: [],
      dataConstraints: [],
      operationalConstraints: [],
    },
    analysisPriorities: {
      relevantPestelDimensions: [
        { dimension: "T", relevance: "HIGH", reason: "tech" },
      ],
      keyCustomerQuestions: ["q1"],
      keyMarketQuestions: ["q2"],
      keyResourceQuestions: ["q3"],
    },
    terminology: { preferredTerms: ["SaaS"], ambiguousTerms: [] },
    competitorPlan: Array.from({ length: count }, (_, i) => ({
      candidateId: `comp-${i + 1}`,
      name: `Competitor ${i + 1}`,
      competitorType: "DIRECT",
      relevanceReason: "reason",
      batch: ((i % 3) + 1) as 1 | 2 | 3,
    })),
    coherenceRules: ["rule"],
    criticalUncertainties: [],
  };
}

describe("validateReplacementRequest", () => {
  it("accepts valid replacement", () => {
    const anchor = makeAnchor();
    const result = validateReplacementRequest({
      anchor,
      request: {
        invalidCandidateId: "comp-1",
        reason: "Not relevant",
        proposedReplacement: {
          name: "NewCo",
          competitorType: "INDIRECT",
          relevanceReason: "Better fit for SMB market",
        },
      },
    });
    expect(result.valid).toBe(true);
  });

  it("rejects duplicate name", () => {
    const anchor = makeAnchor();
    const result = validateReplacementRequest({
      anchor,
      request: {
        invalidCandidateId: "comp-1",
        reason: "test",
        proposedReplacement: {
          name: "Competitor 2",
          competitorType: "DIRECT",
          relevanceReason: "reason",
        },
      },
    });
    expect(result.valid).toBe(false);
  });

  it("rejects unknown candidate", () => {
    const anchor = makeAnchor();
    const result = validateReplacementRequest({
      anchor,
      request: {
        invalidCandidateId: "comp-99",
        reason: "test",
        proposedReplacement: {
          name: "NewCo",
          competitorType: "DIRECT",
          relevanceReason: "reason",
        },
      },
    });
    expect(result.valid).toBe(false);
  });
});

describe("applyReplacementToAnchor", () => {
  it("replaces candidate in plan", () => {
    const anchor = makeAnchor();
    const updated = applyReplacementToAnchor(anchor, {
      invalidCandidateId: "comp-1",
      reason: "irrelevant",
      proposedReplacement: {
        name: "FreshCo",
        competitorType: "INDIRECT",
        relevanceReason: "Better alternative",
      },
    });
    expect(updated.competitorPlan).toHaveLength(6);
    expect(updated.competitorPlan.find((c) => c.name === "FreshCo")).toBeDefined();
    expect(updated.competitorPlan.find((c) => c.name === "Competitor 1")).toBeUndefined();
  });
});
