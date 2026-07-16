import type {
  AggregationStrategy,
  EvaluationMode,
  KpiAssessment,
  MetricValueType,
} from "@prisma/client";
import {
  aggregateMetric,
  type MetricAggregationInput,
  type MetricPointInput,
} from "@/lib/metrics/aggregateMetric";

export type KpiPoint = MetricPointInput & {
  assessment: KpiAssessment;
};

export type MetricForAssessment = MetricAggregationInput & {
  evaluationMode?: EvaluationMode | null;
  valueType?: MetricValueType | null;
  aggregationStrategy?: AggregationStrategy | null;
  successCriterion?: string;
  failureCriterion?: string;
};

const ASSESSMENT_LABELS: Record<KpiAssessment, string> = {
  SUPPORTING: "stützend",
  NEUTRAL: "neutral",
  CONTRADICTING: "widersprechend",
  PENDING: "noch nicht abschließend bewertbar",
};

export function assessmentLabel(assessment: KpiAssessment): string {
  return ASSESSMENT_LABELS[assessment];
}

export function periodAssessmentLabel(
  assessment: KpiAssessment,
  evaluationMode: EvaluationMode
): string {
  if (evaluationMode === "CUMULATIVE" && assessment === "PENDING") {
    return "noch nicht abschließend bewertbar";
  }
  return assessmentLabel(assessment);
}

/** Legacy rows have an explicit evaluation mode; no mode is inferred from prose. */
export function resolveEvaluationMode(metric: MetricForAssessment): EvaluationMode {
  return metric.evaluationMode ?? "PER_POINT";
}

/** Parse only a complete canonical number, never a number embedded in a label. */
export function parseNumericValue(text: string | null | undefined): number | null {
  if (text == null) return null;
  const normalized = text.trim().replace(",", ".");
  if (!/^-?(?:\d+|\d*\.\d+)$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function reassessDataPoints<T extends KpiPoint>(
  metric: MetricForAssessment,
  points: T[]
): T[] {
  return points.map((point, index) => {
    const result = aggregateMetric(metric, points.slice(0, index + 1));
    return { ...point, assessment: result.assessment };
  });
}

export function derivePeriodAssessment(
  metric: MetricForAssessment,
  points: KpiPoint[]
): KpiAssessment {
  return aggregateMetric(metric, points).assessment;
}

export function deriveOverallAssessment(
  metric: MetricForAssessment,
  points: KpiPoint[]
): KpiAssessment {
  return aggregateMetric(metric, points).assessment;
}

export function computeCumulativeTotal(
  points: KpiPoint[],
  metric?: MetricForAssessment
): number {
  if (!metric) {
    return points.reduce(
      (sum, point) => sum + (parseNumericValue(point.value) ?? 0),
      0
    );
  }
  const result = aggregateMetric(metric, points);
  return result.numerator ?? result.value ?? 0;
}

export function isCumulativeEarlySupporting(
  metric: MetricForAssessment,
  points: KpiPoint[]
): boolean {
  return aggregateMetric(metric, points).assessment === "SUPPORTING";
}

export function formatCumulativeTotal(
  metric: MetricForAssessment,
  points: KpiPoint[]
): string {
  return aggregateMetric(metric, points).displayValue;
}

export function formatRunningTotal(
  metric: MetricForAssessment,
  pointsOrValue: KpiPoint[] | number
): string {
  if (Array.isArray(pointsOrValue)) {
    return aggregateMetric(metric, pointsOrValue).displayValue;
  }
  return new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 2,
  }).format(pointsOrValue);
}

/** Normalize criterion text only for display; it is never used for evaluation. */
export function formatCriterionInline(criterion: string): string {
  let text = criterion
    .replace(/^gilt als (?:stützend|widerlegend),?\s*wenn\s*/i, "")
    .trim();
  if (
    text.length > 0 &&
    text[0] === text[0].toUpperCase() &&
    text[0] !== text[0].toLowerCase()
  ) {
    text = text[0].toLowerCase() + text.slice(1);
  }
  return text;
}
