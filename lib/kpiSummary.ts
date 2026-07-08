import type { EvaluationMode, KpiAssessment } from "@prisma/client";
import {
  assessmentLabel,
  computeCumulativeTotal,
  deriveOverallAssessment,
  derivePeriodAssessment,
  formatCriterionInline,
  formatCumulativeTotal,
  formatRunningTotal,
  parseNumericValue,
  periodAssessmentLabel,
  reassessDataPoints,
  resolveEvaluationMode,
  type KpiPoint,
  type MetricForAssessment,
} from "@/lib/kpiAssessment";

export type KpiSummaryMetric = MetricForAssessment & {
  dataPoints: KpiPoint[];
};

function extractPeriodCountLabel(points: KpiPoint[]): string {
  const count = points.length;
  if (count === 0) return "der Periode";
  const firstLabel = points[0]!.periodLabel.toLowerCase();
  if (firstLabel.includes("woche")) {
    return count === 1 ? "1 Woche" : `${count} Wochen`;
  }
  if (firstLabel.includes("tag")) {
    return count === 1 ? "1 Tag" : `${count} Tage`;
  }
  return `${count} Perioden`;
}

function formatCumulativeTrendLine(
  metric: MetricForAssessment,
  point: KpiPoint,
  runningTotal: number
): string {
  const runningLabel = formatRunningTotal(metric, runningTotal);
  return `- ${point.value} · kumuliert ${runningLabel}`;
}

function formatPerPointLine(point: KpiPoint): string {
  return `- ${point.periodLabel}: ${point.value} (${assessmentLabel(point.assessment)})`;
}

export function buildKpiFeedbackSummary(metrics: KpiSummaryMetric[]): string {
  const sections = metrics
    .filter((metric) => metric.dataPoints.length > 0)
    .map((metric) => {
      const reassessed = reassessDataPoints(metric, metric.dataPoints);
      const mode = resolveEvaluationMode(metric);
      const successText = formatCriterionInline(metric.successCriterion);
      const failureText = formatCriterionInline(metric.failureCriterion);
      const lines: string[] = [
        `Metrik „${metric.name}" — stützend, wenn ${successText}; widerlegend, wenn ${failureText}:`,
      ];

      if (mode === "CUMULATIVE") {
        let runningTotal = 0;
        for (const point of reassessed) {
          runningTotal += parseNumericValue(point.value) ?? 0;
          lines.push(formatCumulativeTrendLine(metric, point, runningTotal));
        }
        const overall = derivePeriodAssessment(metric, metric.dataPoints);
        const periodLabel = extractPeriodCountLabel(reassessed);
        lines.push(
          `Gesamt nach ${periodLabel}: ${formatCumulativeTotal(metric, metric.dataPoints)} — ${periodAssessmentLabel(overall, mode)}`
        );
      } else {
        lines.push(...reassessed.map((point) => formatPerPointLine(point)));
        const overall = deriveOverallAssessment(metric, metric.dataPoints);
        if (reassessed.length > 1) {
          lines.push(
            `Gesamturteil über die Periode: ${assessmentLabel(overall)}`
          );
        }
      }

      return lines.join("\n");
    });

  return [
    "Kennzahlen aus dem Umsetzungs-Cockpit (fiktive, simulierte Werte):",
    ...sections,
  ].join("\n\n");
}

export { reassessDataPoints, resolveEvaluationMode, computeCumulativeTotal };
export type { KpiAssessment, EvaluationMode };
