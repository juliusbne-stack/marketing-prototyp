import type { KpiAssessment, MetricType } from "@prisma/client";
import {
  assessmentLabel,
  computeCumulativeTotal,
  deriveOverallAssessment,
  formatCumulativeTotal,
  formatRunningTotal,
  parseNumericValue,
  reassessDataPoints,
  resolveMetricType,
  type KpiPoint,
  type MetricForAssessment,
} from "@/lib/kpiAssessment";

export type KpiSummaryMetric = MetricForAssessment & {
  dataPoints: KpiPoint[];
};

function formatCumulativePointLine(
  metric: MetricForAssessment,
  point: KpiPoint,
  runningTotal: number
): string {
  const increment = parseNumericValue(point.value);
  const runningLabel = formatRunningTotal(metric, runningTotal);
  const incrementPart =
    increment !== null
      ? `${point.value} (Zwischenstand: ${runningLabel})`
      : point.value;
  return `- ${point.periodLabel}: ${incrementPart} (${assessmentLabel(point.assessment)})`;
}

function formatRatePointLine(point: KpiPoint): string {
  return `- ${point.periodLabel}: ${point.value} (${assessmentLabel(point.assessment)})`;
}

export function buildKpiFeedbackSummary(metrics: KpiSummaryMetric[]): string {
  const sections = metrics
    .filter((metric) => metric.dataPoints.length > 0)
    .map((metric) => {
      const reassessed = reassessDataPoints(metric, metric.dataPoints);
      const type = resolveMetricType(metric);
      const lines: string[] = [
        `Metrik „${metric.name}“ — stützend wenn ${metric.successCriterion}; widerlegend wenn ${metric.failureCriterion}:`,
      ];

      if (type === "CUMULATIVE") {
        let runningTotal = 0;
        for (const point of reassessed) {
          runningTotal += parseNumericValue(point.value) ?? 0;
          lines.push(formatCumulativePointLine(metric, point, runningTotal));
        }
        const overall = deriveOverallAssessment(metric, metric.dataPoints);
        lines.push(
          `Gesamt über die Periode: ${formatCumulativeTotal(metric, metric.dataPoints)} — Gesamturteil: ${assessmentLabel(overall)}`
        );
      } else {
        lines.push(...reassessed.map((point) => formatRatePointLine(point)));
        const overall = deriveOverallAssessment(metric, metric.dataPoints);
        if (reassessed.length > 1) {
          lines.push(`Gesamturteil über die Periode: ${assessmentLabel(overall)}`);
        }
      }

      return lines.join("\n");
    });

  return [
    "Kennzahlen aus dem Umsetzungs-Cockpit (fiktive, simulierte Werte):",
    ...sections,
  ].join("\n\n");
}

// Re-export for callers that need enriched data points in the UI.
export { reassessDataPoints, resolveMetricType, computeCumulativeTotal };
export type { KpiAssessment, MetricType };
