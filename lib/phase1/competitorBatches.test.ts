import { describe, expect, it } from "vitest";
import {
  assignBatchesToCompetitorPlan,
  distributeCompetitorsToBatches,
} from "@/lib/phase1/competitorBatches";
import type { Phase1AnalysisAnchor } from "@/lib/phase1/types";

function makeAnchor(count: number): Phase1AnalysisAnchor {
  return {
    marketScope: {
      definition: "Test",
      geography: "DE",
      marketStage: "early",
      relevantBoundaries: ["online"],
      excludedBoundaries: [],
    },
    businessModelCore: {
      offer: "Tool",
      primaryCustomer: "Start-ups",
      userRoles: ["Founder"],
      buyerRoles: ["Founder"],
      payerRoles: ["Founder"],
      coreProblem: "Marketing",
      coreBenefit: "Speed",
      revenueLogic: "SaaS",
    },
    startupContext: {
      productStage: "MVP",
      teamSituation: "2",
      budgetSituation: "low",
      capabilityConstraints: [],
      dataConstraints: [],
      operationalConstraints: [],
    },
    analysisPriorities: {
      relevantPestelDimensions: [
        { dimension: "TECH", relevance: "HIGH", reason: "x" },
      ],
      keyCustomerQuestions: ["q"],
      keyMarketQuestions: ["q"],
      keyResourceQuestions: ["q"],
    },
    terminology: { preferredTerms: ["Start-up"], ambiguousTerms: [] },
    competitorPlan: Array.from({ length: count }, (_, index) => ({
      candidateId: `comp-${index + 1}`,
      name: `Actor ${index + 1} (fiktiv)`,
      competitorType: "DIRECT",
      relevanceReason: "relevant",
      batch: 1 as const,
    })),
    coherenceRules: ["rule"],
    criticalUncertainties: ["uncertainty"],
  };
}

describe("competitor batches", () => {
  it("distributes 6-9 competitors across three batches", () => {
    expect(distributeCompetitorsToBatches(6)).toEqual([2, 2, 2]);
    expect(distributeCompetitorsToBatches(7)).toEqual([3, 2, 2]);
    expect(distributeCompetitorsToBatches(9)).toEqual([3, 3, 3]);
  });

  it("assigns batches in anchor plan", () => {
    const anchor = assignBatchesToCompetitorPlan(makeAnchor(7), 7);
    const batchCounts = [1, 2, 3].map(
      (batch) => anchor.competitorPlan.filter((c) => c.batch === batch).length
    );
    expect(batchCounts).toEqual([3, 2, 2]);
  });
});
