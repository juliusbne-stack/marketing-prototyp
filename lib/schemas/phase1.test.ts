import { describe, expect, it } from "vitest";
import { COMPETITOR_ASPECTS } from "@/lib/competitorAspects";
import { REQUIRED_GENERATED_SEGMENT_ASPECTS } from "@/lib/segmentAspects";
import { createPhase1ResponseSchema, PESTEL_CATEGORIES } from "./phase1";

function statement(category: string, content: string, extra = {}) {
  return {
    category,
    content,
    evidenceStatus: "ASSUMPTION",
    origin: "AI_DERIVATION",
    justification: `Begründung zu ${content}.`,
    uncertainty: `Unsicherheit zu ${content}.`,
    ...extra,
  };
}

function competitorStatements() {
  return Array.from({ length: 6 }, (_, competitorIndex) =>
    COMPETITOR_ASPECTS.map((aspect, aspectIndex) =>
      statement(
        "COMPETITOR",
        `Wettbewerber ${competitorIndex + 1} hat relevantes Merkmal ${aspectIndex + 1}.`,
        {
          competitorLabel: `Wettbewerber ${competitorIndex + 1}`,
          competitorAspect: aspect,
        }
      )
    )
  ).flat();
}

function segmentStatements(label: string) {
  return REQUIRED_GENERATED_SEGMENT_ASPECTS.map((aspect, index) =>
    statement(
      "TARGET_SEGMENT",
      `${label} weist im Aspekt ${aspect} ein prüfbares Merkmal ${index + 1} auf.`,
      {
        segmentLabel: label,
        segmentAspect: aspect,
      }
    )
  );
}

const pestelRelevance = PESTEL_CATEGORIES.map((category) => ({
  category,
  relevant: false,
  relevanceJustification: `${category} ist im Test nicht relevant.`,
}));

describe("createPhase1ResponseSchema", () => {
  it("rejects initial analyses without resources, SWOT and market paths", () => {
    const result = createPhase1ResponseSchema(6).safeParse({
      pestelRelevance,
      statements: [
        ...competitorStatements(),
        statement("COMPETITOR", "Der Wettbewerbsraum ist hinreichend breit."),
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message).join("\n")).toContain(
      "RESOURCE"
    );
    expect(result.error?.issues.map((issue) => issue.message).join("\n")).toContain(
      "SWOT_STRENGTH"
    );
    expect(result.error?.issues.map((issue) => issue.message).join("\n")).toContain(
      "MARKET_PATH"
    );
  });

  it("accepts initial analyses with the required resource, SWOT and market path sections", () => {
    const result = createPhase1ResponseSchema(6).safeParse({
      pestelRelevance,
      statements: [
        ...competitorStatements(),
        ...segmentStatements("B2C Testsegment"),
        ...segmentStatements("B2B Testsegment"),
        statement("COMPETITOR", "Der Wettbewerbsraum ist hinreichend breit."),
        statement("RESOURCE", "Das Team kann wöchentlich fokussierte Tests durchführen."),
        statement("RESOURCE", "Das verfügbare Budget reicht für kleine Experimente."),
        statement("SWOT_STRENGTH", "Die vorhandenen Fähigkeiten erleichtern schnelle Lernzyklen."),
        statement("SWOT_STRENGTH", "Der klare Problemfokus stärkt die frühe Positionierung."),
        statement("SWOT_WEAKNESS", "Die begrenzte Zeit reduziert die Zahl paralleler Tests."),
        statement("SWOT_WEAKNESS", "Die geringe Datenbasis erschwert belastbare Entscheidungen."),
        statement("SWOT_OPPORTUNITY", "Spezialisierte Teilsegmente können gezielt angesprochen werden."),
        statement("SWOT_OPPORTUNITY", "Frühe Gespräche können konkrete Zahlungsbereitschaft sichtbar machen."),
        statement("SWOT_THREAT", "Etablierte Alternativen können Vertrauen schneller erzeugen."),
        statement("SWOT_THREAT", "Unklare Wechselbereitschaft kann den Marktzugang bremsen."),
        statement("MARKET_PATH", "Ein fokussierter Nischenpfad kann zuerst validiert werden."),
        statement("MARKET_PATH", "Ein partnerschaftlicher Zugang kann Reichweite ressourcenschonend testen."),
      ],
    });

    expect(
      result.success,
      result.error?.issues.map((issue) => issue.message).join("\n")
    ).toBe(true);
  });
});
