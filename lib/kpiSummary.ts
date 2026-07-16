import type { ProxyStrength } from "@prisma/client";
import {
  aggregateMetric,
  type MetricAggregationInput,
  type MetricPointInput,
} from "@/lib/metrics/aggregateMetric";
import {
  assessmentLabel,
  formatCriterionInline,
  reassessDataPoints,
  resolveEvaluationMode,
} from "@/lib/kpiAssessment";

export type KpiSummaryMetric = MetricAggregationInput & {
  proxyStrength?: ProxyStrength | null;
  successCriterion: string;
  failureCriterion: string;
  dataPoints: (MetricPointInput & {
    assessment: "SUPPORTING" | "NEUTRAL" | "CONTRADICTING" | "PENDING";
  })[];
};

function assessmentExplanation(
  metric: KpiSummaryMetric,
  assessment: KpiSummaryMetric["dataPoints"][number]["assessment"],
  isComplete: boolean
): string {
  if (!isComplete || assessment === "PENDING") {
    return "Noch nicht abschließend bewertbar";
  }
  if (assessment === "SUPPORTING") {
    return `Stützend – der festgelegte Schwellenwert (${formatCriterionInline(
      metric.successCriterion
    )}) wurde erreicht.`;
  }
  if (assessment === "CONTRADICTING") {
    return `Widerlegend – der festgelegte Schwellenwert (${formatCriterionInline(
      metric.failureCriterion
    )}) wurde erreicht.`;
  }
  return "Neutral – das Ergebnis liegt zwischen Erfolgs- und Misserfolgsschwelle.";
}

export function buildKpiFeedbackSummary(metrics: KpiSummaryMetric[]): string {
  const sections = metrics
    .filter((metric) => metric.dataPoints.length > 0)
    .map((metric) => {
      const result = aggregateMetric(metric, metric.dataPoints);
      const lines = [`Metrik „${metric.name}":`];

      if (!result.isValid) {
        lines.push(result.explanation);
        return lines.join("\n");
      }

      for (const period of result.periods) {
        lines.push(
          `${period.periodLabel}\nDiese Periode: ${period.periodDisplayValue}\nKumuliert: ${period.cumulativeDisplayValue}`
        );
      }

      lines.push(
        `Gesamtergebnis: ${result.displayValue}`,
        `${result.periodCount} ${
          result.periodCount === 1 ? "Erhebungswelle" : "Erhebungswellen"
        }`,
        `Bewertung: ${assessmentExplanation(
          metric,
          result.assessment,
          result.isComplete
        )}`
      );

      if (result.assessment === "SUPPORTING") {
        lines.push(
          metric.proxyStrength === "PROXY"
            ? "Die Messgröße liefert einen mittelbaren Beleg für einen Teilaspekt der geprüften Annahme."
            : "Die Messgröße stützt einen Teilaspekt der geprüften Annahme; die Gesamtannahme wird aus allen entscheidenden Messgrößen und qualitativen Befunden bewertet."
        );
      } else {
        lines.push(
          `Technische Einordnung: ${assessmentLabel(result.assessment)}. Die Gesamtannahme wird nicht aus dieser einzelnen Messgröße abgeleitet.`
        );
      }

      return lines.join("\n");
    });

  return [
    "Kennzahlen aus dem Umsetzungs-Cockpit (fiktive, simulierte Werte):",
    ...sections,
  ].join("\n\n");
}

export { aggregateMetric, reassessDataPoints, resolveEvaluationMode };
