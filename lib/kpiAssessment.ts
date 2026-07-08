import type { EvaluationMode, KpiAssessment } from "@prisma/client";

export type KpiPoint = {
  periodLabel: string;
  value: string;
  assessment: KpiAssessment;
};

export type MetricForAssessment = {
  evaluationMode?: EvaluationMode | null;
  name: string;
  successCriterion: string;
  failureCriterion: string;
};

const ASSESSMENT_LABELS: Record<KpiAssessment, string> = {
  SUPPORTING: "stützend",
  NEUTRAL: "neutral",
  CONTRADICTING: "widersprechend",
};

export function assessmentLabel(assessment: KpiAssessment): string {
  return ASSESSMENT_LABELS[assessment];
}

/** Cumulative period-end NEUTRAL is displayed as „teilweise gestützt". */
export function periodAssessmentLabel(
  assessment: KpiAssessment,
  evaluationMode: EvaluationMode
): string {
  if (evaluationMode === "CUMULATIVE" && assessment === "NEUTRAL") {
    return "teilweise gestützt";
  }
  return assessmentLabel(assessment);
}

/** Fallback when evaluationMode is missing on legacy rows. */
export function inferEvaluationMode(
  name: string,
  successCriterion: string,
  failureCriterion: string
): EvaluationMode {
  const combined =
    `${name} ${successCriterion} ${failureCriterion}`.toLowerCase();
  const perPointPatterns =
    /%|rate|quote|anteil|interaktion|conversion|ctr|klickrate|öffnungsrate/;
  if (perPointPatterns.test(combined)) return "PER_POINT";
  const cumulativePatterns =
    /innerhalb von|gesamt|summe|anzahl|registrierung|anfrage|buchung|verkauf|interview|kontakt|teilnehmer|kunden|leads|insgesamt über/;
  if (cumulativePatterns.test(combined)) return "CUMULATIVE";
  return "PER_POINT";
}

export function resolveEvaluationMode(metric: MetricForAssessment): EvaluationMode {
  return (
    metric.evaluationMode ??
    inferEvaluationMode(
      metric.name,
      metric.successCriterion,
      metric.failureCriterion
    )
  );
}

/** Extract the first numeric value from a KPI text (e.g. "12 neue Anfragen", "2,5 %"). */
export function parseNumericValue(text: string): number | null {
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*%?/);
  if (!match) return null;
  const num = Number.parseFloat(match[1].replace(",", "."));
  return Number.isFinite(num) ? num : null;
}

function parseMinThreshold(criterion: string): number | null {
  const patterns = [
    /(?:mindestens|über|mehr als|≥|>=|bei über|bleibt bei über)\s*(\d+(?:[.,]\d+)?)\s*%?/i,
    /(\d+(?:[.,]\d+)?)\s*%?\s*oder (?:mehr|steigt|höher)/i,
  ];
  for (const pattern of patterns) {
    const match = criterion.match(pattern);
    if (match) {
      const num = Number.parseFloat(match[1].replace(",", "."));
      if (Number.isFinite(num)) return num;
    }
  }
  return null;
}

function parseMaxThreshold(criterion: string): number | null {
  const patterns = [
    /(?:weniger als|unter|maximal|höchstens|<)\s*(\d+(?:[.,]\d+)?)\s*%?/i,
    /fällt unter\s*(\d+(?:[.,]\d+)?)\s*%?/i,
  ];
  for (const pattern of patterns) {
    const match = criterion.match(pattern);
    if (match) {
      const num = Number.parseFloat(match[1].replace(",", "."));
      if (Number.isFinite(num)) return num;
    }
  }
  return null;
}

function isPercentMetric(metric: MetricForAssessment): boolean {
  const combined =
    `${metric.name} ${metric.successCriterion} ${metric.failureCriterion}`.includes(
      "%"
    );
  return combined;
}

function formatNumber(value: number, asPercent: boolean): string {
  const formatted = Number.isInteger(value)
    ? String(value)
    : value.toFixed(1).replace(".", ",");
  return asPercent ? `${formatted} %` : formatted;
}

export function assessValue(
  value: number,
  successCriterion: string,
  failureCriterion: string,
  options?: { isFinalPeriod?: boolean; forCumulative?: boolean }
): KpiAssessment {
  const successMin = parseMinThreshold(successCriterion);
  const failureMax = parseMaxThreshold(failureCriterion);

  if (successMin !== null && value >= successMin) {
    return "SUPPORTING";
  }

  if (options?.forCumulative && !options.isFinalPeriod) {
    return "NEUTRAL";
  }

  if (failureMax !== null && value < failureMax) {
    return "CONTRADICTING";
  }

  return "NEUTRAL";
}

/** Recompute assessments: per-period for PER_POINT; period-level only for CUMULATIVE. */
export function reassessDataPoints<T extends KpiPoint>(
  metric: MetricForAssessment,
  points: T[]
): T[] {
  const mode = resolveEvaluationMode(metric);

  if (mode === "PER_POINT") {
    return points.map((point) => {
      const num = parseNumericValue(point.value);
      if (num === null) return point;
      return {
        ...point,
        assessment: assessValue(
          num,
          metric.successCriterion,
          metric.failureCriterion
        ),
      };
    });
  }

  let runningTotal = 0;
  const periodAssessment = derivePeriodAssessment(metric, points);

  return points.map((point, index) => {
    runningTotal += parseNumericValue(point.value) ?? 0;
    const isFinalPeriod = index === points.length - 1;
    return {
      ...point,
      assessment: isFinalPeriod ? periodAssessment : "NEUTRAL",
    };
  });
}

export function derivePeriodAssessment(
  metric: MetricForAssessment,
  points: KpiPoint[]
): KpiAssessment {
  if (points.length === 0) return "NEUTRAL";
  const total = computeCumulativeTotal(points);
  return assessValue(total, metric.successCriterion, metric.failureCriterion, {
    isFinalPeriod: true,
    forCumulative: true,
  });
}

export function computeCumulativeTotal(points: KpiPoint[]): number {
  return points.reduce(
    (sum, point) => sum + (parseNumericValue(point.value) ?? 0),
    0
  );
}

export function deriveOverallAssessment(
  metric: MetricForAssessment,
  points: KpiPoint[]
): KpiAssessment {
  const mode = resolveEvaluationMode(metric);
  if (points.length === 0) return "NEUTRAL";

  if (mode === "CUMULATIVE") {
    return derivePeriodAssessment(metric, points);
  }

  const reassessed = reassessDataPoints(metric, points);
  const supporting = reassessed.filter(
    (point) => point.assessment === "SUPPORTING"
  ).length;
  const contradicting = reassessed.filter(
    (point) => point.assessment === "CONTRADICTING"
  ).length;

  if (supporting > contradicting && supporting > reassessed.length / 2) {
    return "SUPPORTING";
  }
  if (contradicting > supporting && contradicting > reassessed.length / 2) {
    return "CONTRADICTING";
  }
  return "NEUTRAL";
}

/** Whether the running cumulative total already exceeds the success threshold. */
export function isCumulativeEarlySupporting(
  metric: MetricForAssessment,
  points: KpiPoint[]
): boolean {
  if (resolveEvaluationMode(metric) !== "CUMULATIVE") return false;
  const successMin = parseMinThreshold(metric.successCriterion);
  if (successMin === null) return false;
  return computeCumulativeTotal(points) >= successMin;
}

/** Extract text after the leading number (e.g. "12 neue Anfragen" → "neue Anfragen"). */
function extractValueSuffix(value: string): string {
  return value.replace(/^(\d+(?:[.,]\d+)?)\s*%?\s*/, "").trim();
}

export function formatCumulativeTotal(
  metric: MetricForAssessment,
  points: KpiPoint[]
): string {
  const total = computeCumulativeTotal(points);
  const asPercent = isPercentMetric(metric);
  const formatted = formatNumber(total, asPercent);
  const suffix = points
    .map((point) => extractValueSuffix(point.value))
    .find(Boolean);
  return suffix ? `${formatted} ${suffix}` : formatted;
}

export function formatRunningTotal(
  metric: MetricForAssessment,
  runningTotal: number
): string {
  return formatNumber(runningTotal, isPercentMetric(metric));
}

/** Normalize criterion text for inline use after „wenn". */
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

export { parseMinThreshold, parseMaxThreshold };
