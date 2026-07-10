import { PESTEL_CATEGORIES } from "@/lib/schemas/phase1";
import type { Phase1Statement, PestelRelevance } from "@/lib/schemas/phase1";
import type { Phase1AnalysisAnchor, SynthesisInput } from "./types";

const SWOT_ORDER = [
  "SWOT_STRENGTH",
  "SWOT_WEAKNESS",
  "SWOT_OPPORTUNITY",
  "SWOT_THREAT",
] as const;

const PESTEL_ORDER = [...PESTEL_CATEGORIES];

export function sortPhase1Statements(
  statements: Phase1Statement[],
  anchor?: Phase1AnalysisAnchor
): Phase1Statement[] {
  const competitorOrder = new Map(
    anchor?.competitorPlan.map((c, index) => [c.name.trim().toLowerCase(), index]) ??
      []
  );

  function categoryRank(category: string): number {
    if (category.startsWith("PESTEL_")) {
      return PESTEL_ORDER.indexOf(category as (typeof PESTEL_ORDER)[number]);
    }
    if (category === "TARGET_SEGMENT") return 100;
    if (category === "CUSTOMER_PROBLEM") return 110;
    if (category === "COMPETITOR") return 120;
    if (category === "RESOURCE") return 130;
    const swotIndex = SWOT_ORDER.indexOf(
      category as (typeof SWOT_ORDER)[number]
    );
    if (swotIndex >= 0) return 140 + swotIndex;
    if (category === "MARKET_PATH") return 150;
    return 999;
  }

  return [...statements].sort((a, b) => {
    const rankDiff = categoryRank(a.category) - categoryRank(b.category);
    if (rankDiff !== 0) return rankDiff;

    if (a.category === "TARGET_SEGMENT" && b.category === "TARGET_SEGMENT") {
      const labelDiff = (a.segmentLabel ?? "").localeCompare(
        b.segmentLabel ?? "",
        "de"
      );
      if (labelDiff !== 0) return labelDiff;
      return (a.segmentAspect ?? "").localeCompare(b.segmentAspect ?? "");
    }

    if (a.category === "COMPETITOR" && b.category === "COMPETITOR") {
      const aLabel = a.competitorLabel?.trim().toLowerCase() ?? "";
      const bLabel = b.competitorLabel?.trim().toLowerCase() ?? "";
      if (aLabel && bLabel) {
        const orderA = competitorOrder.get(aLabel) ?? 999;
        const orderB = competitorOrder.get(bLabel) ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        return (a.competitorAspect ?? "").localeCompare(
          b.competitorAspect ?? ""
        );
      }
      if (!aLabel && bLabel) return -1;
      if (aLabel && !bLabel) return 1;
    }

    return a.content.localeCompare(b.content, "de");
  });
}

export function buildSynthesisInput(options: {
  anchor: Phase1AnalysisAnchor;
  pestelStatements: Phase1Statement[];
  segmentStatements: Phase1Statement[];
  customerProblems: Phase1Statement[];
  resourceStatements: Phase1Statement[];
  competitorStatements: Phase1Statement[];
}): SynthesisInput {
  let pestelIndex = 0;
  let segmentIndex = 0;
  let problemIndex = 0;
  let resourceIndex = 0;
  let competitorIndex = 0;

  const segmentsByLabel = new Map<string, Phase1Statement[]>();
  for (const statement of options.segmentStatements) {
    const label = statement.segmentLabel ?? "segment";
    const group = segmentsByLabel.get(label) ?? [];
    group.push(statement);
    segmentsByLabel.set(label, group);
  }

  const competitorsByLabel = new Map<string, Phase1Statement[]>();
  for (const statement of options.competitorStatements) {
    if (!statement.competitorLabel) continue;
    const group = competitorsByLabel.get(statement.competitorLabel) ?? [];
    group.push(statement);
    competitorsByLabel.set(statement.competitorLabel, group);
  }

  return {
    anchor: options.anchor,
    pestel: options.pestelStatements.map((s) => ({
      refId: `PEST-${++pestelIndex}`,
      category: s.category,
      content: s.content,
      evidenceStatus: s.evidenceStatus,
    })),
    segments: [...segmentsByLabel.entries()].map(([segmentName, stmts]) => ({
      refId: `SEG-${++segmentIndex}`,
      segmentName,
      keyCharacteristics: stmts
        .filter((s) => s.segmentAspect === "DESCRIPTION")
        .map((s) => s.content),
      keyProblems: stmts
        .filter((s) => s.segmentAspect === "PROBLEM_NEED")
        .map((s) => s.content),
      keyNeeds: stmts
        .filter((s) => s.segmentAspect === "BEHAVIOR_CONTEXT")
        .map((s) => s.content),
      accessibility: stmts
        .filter((s) => s.segmentAspect === "REACHABILITY")
        .map((s) => s.content),
    })),
    customerProblems: options.customerProblems.map((s) => ({
      refId: `CP-${++problemIndex}`,
      content: s.content,
      evidenceStatus: s.evidenceStatus,
    })),
    resources: options.resourceStatements.map((s) => ({
      refId: `RES-${++resourceIndex}`,
      category: s.category,
      content: s.content,
    })),
    competitors: [...competitorsByLabel.entries()].map(([name, stmts]) => ({
      refId: `COMP-${++competitorIndex}`,
      name,
      competitorType:
        stmts.find((s) => s.competitorAspect === "ENTITY_TYPE")?.content ?? "",
      keyOffer:
        stmts.find((s) => s.competitorAspect === "OFFERING")?.content ?? "",
      keyStrengths: stmts
        .filter((s) => s.competitorAspect === "SCALE")
        .map((s) => s.content),
      keyWeaknesses: stmts
        .filter((s) => s.competitorAspect === "PRICING")
        .map((s) => s.content),
      strategicRelevance:
        stmts.find((s) => s.competitorAspect === "RELEVANCE")?.content ?? "",
    })),
  };
}

export function combinePhase1Outputs(options: {
  anchor: Phase1AnalysisAnchor;
  pestelRelevance: PestelRelevance[];
  pestelStatements: Phase1Statement[];
  segmentStatements: Phase1Statement[];
  customerProblems: Phase1Statement[];
  resourceStatements: Phase1Statement[];
  competitorStatements: Phase1Statement[];
  landscapeStatements: Phase1Statement[];
  swotStatements: Phase1Statement[];
  marketPathStatements: Phase1Statement[];
}): Phase1Statement[] {
  const combined = [
    ...options.pestelStatements,
    ...options.segmentStatements,
    ...options.customerProblems,
    ...options.resourceStatements,
    ...options.competitorStatements,
    ...options.landscapeStatements,
    ...options.swotStatements,
    ...options.marketPathStatements,
  ];
  return sortPhase1Statements(combined, options.anchor);
}
