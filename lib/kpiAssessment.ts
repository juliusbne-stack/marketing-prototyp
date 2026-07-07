import type { KpiAssessment, MetricType } from "@prisma/client";

export type KpiPoint = {
  periodLabel: string;
  value: string;
  assessment: KpiAssessment;
};

export type MetricForAssessment = {
  metricType?: MetricType | null;
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

/** Fallback when metricType is missing on legacy rows. */
export function inferMetricType(
  name: string,
  successCriterion: string,
  failureCriterion: string
): MetricType {
  const combined =
    `${name} ${successCriterion} ${failureCriterion}`.toLowerCase();
  const ratePatterns =
    /%|rate|quote|anteil|interaktion|conversion|ctr|klickrate|öffnungsrate/;
  if (ratePatterns.test(combined)) return "RATE";
  const cumulativePatterns =
    /innerhalb von|gesamt|summe|anzahl|registrierung|anfrage|buchung|verkauf|interview|kontakt|teilnehmer|kunden|leads/;
  if (cumulativePatterns.test(combined)) return "CUMULATIVE";
  return "RATE";
}

export function resolveMetricType(metric: MetricForAssessment): MetricType {
  return metric.metricType ?? inferMetricType(
    metric.name,
    metric.successCriterion,
    metric.failureCriterion
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

/** Recompute assessments: per-period for RATE, running total for CUMULATIVE. */
export function reassessDataPoints<T extends KpiPoint>(
  metric: MetricForAssessment,
  points: T[]
): T[] {
  const type = resolveMetricType(metric);

  if (type === "RATE") {
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
  return points.map((point, index) => {
    runningTotal += parseNumericValue(point.value) ?? 0;
    const isFinalPeriod = index === points.length - 1;
    return {
      ...point,
      assessment: assessValue(
        runningTotal,
        metric.successCriterion,
        metric.failureCriterion,
        { isFinalPeriod, forCumulative: true }
      ),
    };
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
  if (points.length === 0) return "NEUTRAL";
  const reassessed = reassessDataPoints(metric, points);
  return reassessed[reassessed.length - 1]!.assessment;
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
  const suffix = points.map((point) => extractValueSuffix(point.value)).find(Boolean);
  return suffix ? `${formatted} ${suffix}` : formatted;
}

export function formatRunningTotal(
  metric: MetricForAssessment,
  runningTotal: number
): string {
  return formatNumber(runningTotal, isPercentMetric(metric));
}
