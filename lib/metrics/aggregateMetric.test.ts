import { describe, expect, it } from "vitest";
import { aggregateMetric } from "./aggregateMetric";
import { kpiDataPointInputSchema } from "@/lib/schemas/kpiSimulation";

const countMetric = {
  name: "Befragte mit relevantem Problem",
  evaluationMode: "CUMULATIVE" as const,
  valueType: "COUNT_OF_TOTAL" as const,
  aggregationStrategy: "RATE_FROM_SUMS" as const,
  observationUnit: "Befragten",
  evaluationConfig: {
    kind: "COUNT_OF_TOTAL",
    requiredDenominator: 18,
    success: { operator: "GTE", numerator: 12 },
    failure: { operator: "LTE", numerator: 7 },
  },
} as const;

const points = [
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
];

describe("aggregateMetric", () => {
  it("aggregates incremental COUNT_OF_TOTAL points from sums", () => {
    const result = aggregateMetric(countMetric, points);
    expect(result.numerator).toBe(14);
    expect(result.denominator).toBe(18);
    expect(result.percentage).toBeCloseTo(77.777777, 5);
    expect(result.assessment).toBe("SUPPORTING");
    expect(result.periodCount).toBe(3);
    expect(result.displayValue).toBe("14 von 18 Befragten (77,8 %)");
    expect(result.periods.map((period) => period.cumulativeDisplayValue)).toEqual([
      "4 von 6",
      "8 von 12",
      "14 von 18",
    ]);
  });

  it("does not interpret cumulative snapshots as increments", () => {
    const result = aggregateMetric(countMetric, [
      { periodLabel: "Welle 1", value: "4 von 6" },
      { periodLabel: "Welle 2", value: "8 von 12" },
      { periodLabel: "Welle 3", value: "14 von 18" },
    ]);
    expect(result.isValid).toBe(false);
    expect(result.numerator).toBeUndefined();
    expect(result.displayValue).toBe("Nicht zuverlässig auswertbar");
  });

  it("never uses the period count as denominator", () => {
    const result = aggregateMetric(countMetric, points);
    expect(result.periodCount).toBe(3);
    expect(result.denominator).toBe(18);
  });

  it("stays pending before the required sample is reached", () => {
    const result = aggregateMetric(countMetric, points.slice(0, 2));
    expect(result.numerator).toBe(8);
    expect(result.denominator).toBe(12);
    expect(result.assessment).toBe("PENDING");
    expect(result.explanation).toBe("Noch nicht abschließend bewertbar");
  });

  it("returns neutral inside the configured interval", () => {
    const result = aggregateMetric(countMetric, [
      { periodLabel: "Gesamt", numerator: 10, denominator: 18 },
    ]);
    expect(result.assessment).toBe("NEUTRAL");
  });

  it("returns contradicting at the configured failure threshold", () => {
    const result = aggregateMetric(countMetric, [
      { periodLabel: "Gesamt", numerator: 7, denominator: 18 },
    ]);
    expect(result.assessment).toBe("CONTRADICTING");
  });

  it("rejects zero denominators and numerators above denominators", () => {
    expect(
      kpiDataPointInputSchema.safeParse({
        periodLabel: "Welle 1",
        numerator: 4,
        denominator: 0,
        assessment: "NEUTRAL",
      }).success
    ).toBe(false);
    expect(
      kpiDataPointInputSchema.safeParse({
        periodLabel: "Welle 1",
        numerator: 7,
        denominator: 6,
        assessment: "NEUTRAL",
      }).success
    ).toBe(false);
  });

  it("rejects mixed scalar and ratio representations", () => {
    const result = aggregateMetric(countMetric, [
      { periodLabel: "Welle 1", numerator: 4, denominator: 6 },
      { periodLabel: "Welle 2", value: "12" },
    ]);
    expect(result.isValid).toBe(false);
  });

  it("calculates rates from summed numerators and denominators", () => {
    const result = aggregateMetric(
      {
        ...countMetric,
        valueType: "PERCENTAGE",
        observationUnit: null,
        evaluationConfig: {
          kind: "PERCENTAGE",
          success: { operator: "GTE", percentage: 60 },
          failure: { operator: "LT", percentage: 40 },
        },
      },
      [
        { periodLabel: "A", numerator: 1, denominator: 2 },
        { periodLabel: "B", numerator: 9, denominator: 10 },
      ]
    );
    expect(result.percentage).toBeCloseTo(83.3333, 3);
    expect(result.percentage).not.toBe(140);
  });

  it("rejects SUM for percentage values", () => {
    const result = aggregateMetric(
      {
        name: "Conversion",
        valueType: "PERCENTAGE",
        aggregationStrategy: "SUM",
      },
      [
        { periodLabel: "1", value: "40" },
        { periodLabel: "2", value: "60" },
      ]
    );
    expect(result.isValid).toBe(false);
  });

  it("sums simple counts", () => {
    const result = aggregateMetric(
      {
        name: "Anfragen",
        valueType: "COUNT",
        aggregationStrategy: "SUM",
      },
      [
        { periodLabel: "1", value: "3" },
        { periodLabel: "2", value: "5" },
        { periodLabel: "3", value: "2" },
      ]
    );
    expect(result.value).toBe(10);
  });

  it("averages scalar values", () => {
    const result = aggregateMetric(
      {
        name: "Bewertung",
        valueType: "SCORE",
        aggregationStrategy: "AVERAGE",
      },
      [
        { periodLabel: "1", value: "3" },
        { periodLabel: "2", value: "4" },
        { periodLabel: "3", value: "5" },
      ]
    );
    expect(result.value).toBe(4);
  });

  it("uses only the latest value for LATEST", () => {
    const result = aggregateMetric(
      {
        name: "Bestand",
        valueType: "SCALAR",
        aggregationStrategy: "LATEST",
      },
      [
        { periodLabel: "1", value: "10" },
        { periodLabel: "2", value: "15" },
        { periodLabel: "3", value: "12" },
      ]
    );
    expect(result.value).toBe(12);
  });

  it("marks unstructured legacy ratios as ambiguous", () => {
    const result = aggregateMetric(countMetric, [
      { periodLabel: "Altbestand", value: "8 von 12" },
    ]);
    expect(result.assessment).toBe("PENDING");
    expect(result.isValid).toBe(false);
    expect(result.explanation).toContain("getrennt");
  });
});
