import type { KpiAssessment } from "@prisma/client";

// LLM-free bridge from cockpit KPI data to phase 5: builds a factual German
// summary of all data points of a step, used as MarketFeedback draft content.
// The user reviews, edits and evaluates it in phase 5 as usual.

export type KpiSummaryMetric = {
  name: string;
  successCriterion: string;
  failureCriterion: string;
  dataPoints: {
    periodLabel: string;
    value: string;
    assessment: KpiAssessment;
  }[];
};

const ASSESSMENT_LABELS: Record<KpiAssessment, string> = {
  SUPPORTING: "stützend",
  NEUTRAL: "neutral",
  CONTRADICTING: "widersprechend",
};

export function buildKpiFeedbackSummary(metrics: KpiSummaryMetric[]): string {
  const sections = metrics
    .filter((metric) => metric.dataPoints.length > 0)
    .map((metric) => {
      const lines = metric.dataPoints.map(
        (point) =>
          `- ${point.periodLabel}: ${point.value} (${ASSESSMENT_LABELS[point.assessment]})`
      );
      return [
        `Metrik „${metric.name}“ — stützend wenn ${metric.successCriterion}; widerlegend wenn ${metric.failureCriterion}:`,
        ...lines,
      ].join("\n");
    });

  return [
    "Kennzahlen aus dem Umsetzungs-Cockpit (fiktive, simulierte Werte):",
    ...sections,
  ].join("\n\n");
}
