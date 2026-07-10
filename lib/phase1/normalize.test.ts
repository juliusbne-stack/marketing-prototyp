import { describe, expect, it } from "vitest";
import { normalizeCompactStatement } from "@/lib/phase1/normalize";

describe("normalizeCompactStatement", () => {
  it("sets fiktiv sourceRef for simulated research", () => {
    const statement = normalizeCompactStatement({
      category: "COMPETITOR",
      content: "Preis liegt bei 29 € pro Monat.",
      evidenceStatus: "FACT",
      origin: "SIMULATED_RESEARCH",
      justification: "Aus simulierter Preisseite.",
      sourceRef: "Preisseite (fiktiv)",
      uncertainty: null,
      competitorLabel: "Tool A (fiktiv)",
      competitorAspect: "PRICING",
    });
    expect(statement.sourceRef).toMatch(/\(fiktiv\)$/i);
  });

  it("applies profile-level competitor label", () => {
    const statement = normalizeCompactStatement(
      {
        category: "COMPETITOR",
        content: "Bietet ein SaaS-Angebot.",
        evidenceStatus: "ASSUMPTION",
        origin: "AI_DERIVATION",
        justification: "Ableitung.",
        uncertainty: "Unklar.",
        competitorAspect: "OFFERING",
      },
      { competitorLabel: "Tool B (fiktiv)" }
    );
    expect(statement.competitorLabel).toBe("Tool B (fiktiv)");
  });
});
