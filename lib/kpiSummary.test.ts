import { describe, expect, it } from "vitest";
import { buildKpiFeedbackSummary } from "./kpiSummary";
import { aggregateMetric } from "@/lib/metrics/aggregateMetric";

const metric = {
  name: "Befragte mit eigenständig genanntem wiederkehrendem Meal-Prep-Problem",
  evaluationMode: "CUMULATIVE" as const,
  valueType: "COUNT_OF_TOTAL" as const,
  aggregationStrategy: "RATE_FROM_SUMS" as const,
  observationUnit: "Befragten",
  proxyStrength: "DIRECT" as const,
  successCriterion:
    "Mindestens 12 von 18 nennen ohne Vorgabe einen wiederkehrenden relevanten Aufwand.",
  failureCriterion: "Höchstens 7 von 18 nennen einen relevanten Aufwand.",
  evaluationConfig: {
    kind: "COUNT_OF_TOTAL",
    requiredDenominator: 18,
    success: { operator: "GTE", numerator: 12 },
    failure: { operator: "LTE", numerator: 7 },
  },
  dataPoints: [
    {
      periodLabel: "Welle 1",
      numerator: 4,
      denominator: 6,
      assessment: "PENDING" as const,
    },
    {
      periodLabel: "Welle 2",
      numerator: 4,
      denominator: 6,
      assessment: "PENDING" as const,
    },
    {
      periodLabel: "Welle 3",
      numerator: 6,
      denominator: 6,
      assessment: "SUPPORTING" as const,
    },
  ],
} as const;

describe("buildKpiFeedbackSummary", () => {
  it("uses the same central result as the cockpit", () => {
    const result = aggregateMetric(metric, [...metric.dataPoints]);
    const summary = buildKpiFeedbackSummary([
      { ...metric, dataPoints: [...metric.dataPoints] },
    ]);

    expect(result.displayValue).toBe("14 von 18 Befragten (77,8 %)");
    expect(summary).toContain(result.displayValue);
    expect(summary).toContain("Welle 2\nDiese Periode: 4 von 6\nKumuliert: 8 von 12");
    expect(summary).toContain("3 Erhebungswellen");
    expect(summary).toContain("Bewertung: Stützend");
    expect(summary).toContain("Die Messgröße stützt einen Teilaspekt");
    expect(summary).not.toContain("40 von 6");
    expect(summary).not.toContain("Gesamtannahme bestätigt");
  });
});
