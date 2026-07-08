import type { KpiScenario } from "@/lib/schemas/kpiSimulation";
import {
  assessValue,
  computeCumulativeTotal,
  derivePeriodAssessment,
  parseMaxThreshold,
  parseMinThreshold,
  parseNumericValue,
  reassessDataPoints,
  resolveEvaluationMode,
  type KpiPoint,
  type MetricForAssessment,
} from "@/lib/kpiAssessment";

function extractValueSuffix(value: string): string {
  return value.replace(/^(\d+(?:[.,]\d+)?)\s*%?\s*/, "").trim();
}

function formatIncrement(value: number, suffix: string, asPercent: boolean): string {
  const formatted = asPercent
    ? `${value.toFixed(1).replace(".", ",")} %`
    : String(Math.round(value));
  return suffix ? `${formatted} ${suffix}` : formatted;
}

function adjustCumulativeSeries<T extends KpiPoint>(
  metric: MetricForAssessment,
  points: T[],
  scenario: KpiScenario
): T[] {
  if (points.length === 0) return points;

  const successMin = parseMinThreshold(metric.successCriterion);
  const failureMax = parseMaxThreshold(metric.failureCriterion);
  const suffix =
    points.map((point) => extractValueSuffix(point.value)).find(Boolean) ?? "";
  const asPercent = metric.successCriterion.includes("%");

  let targetTotal: number | null = null;
  switch (scenario) {
    case "SUPPORTING":
      targetTotal = successMin ?? computeCumulativeTotal(points);
      break;
    case "CONTRADICTING":
      targetTotal =
        failureMax !== null ? Math.max(0, failureMax - 1) : computeCumulativeTotal(points);
      break;
    case "MIXED":
      if (successMin !== null && failureMax !== null && failureMax < successMin) {
        targetTotal = Math.floor((failureMax + successMin) / 2);
      }
      break;
  }

  if (targetTotal === null) return points;

  const currentTotal = computeCumulativeTotal(points);
  const delta = targetTotal - currentTotal;
  if (delta === 0) return points;

  const adjusted = [...points];
  const lastIndex = adjusted.length - 1;
  const lastPoint = adjusted[lastIndex]!;
  const lastValue = parseNumericValue(lastPoint.value) ?? 0;
  const newLastValue = Math.max(0, lastValue + delta);

  adjusted[lastIndex] = {
    ...lastPoint,
    value: formatIncrement(newLastValue, suffix, asPercent),
    assessment: "NEUTRAL",
  };

  return adjusted;
}

function adjustPerPointSeries<T extends KpiPoint>(
  metric: MetricForAssessment,
  points: T[],
  scenario: KpiScenario
): T[] {
  const reassessed = reassessDataPoints(metric, points);
  const count = reassessed.length;
  if (count === 0) return points;

  const supporting = reassessed.filter(
    (point) => point.assessment === "SUPPORTING"
  ).length;
  const contradicting = reassessed.filter(
    (point) => point.assessment === "CONTRADICTING"
  ).length;
  const majority = Math.floor(count / 2) + 1;

  const needsMoreSupporting =
    scenario === "SUPPORTING" && supporting < majority;
  const needsMoreContradicting =
    scenario === "CONTRADICTING" && contradicting < majority;
  const needsMixed =
    scenario === "MIXED" &&
    (supporting >= majority || contradicting >= majority);

  if (!needsMoreSupporting && !needsMoreContradicting && !needsMixed) {
    return reassessed;
  }

  const successMin = parseMinThreshold(metric.successCriterion);
  const failureMax = parseMaxThreshold(metric.failureCriterion);
  const suffix =
    points.map((point) => extractValueSuffix(point.value)).find(Boolean) ?? "";
  const asPercent = metric.successCriterion.includes("%");

  const adjusted = [...reassessed];

  for (let i = 0; i < adjusted.length; i++) {
    const point = adjusted[i]!;
    let targetAssessment: "SUPPORTING" | "NEUTRAL" | "CONTRADICTING" | null =
      null;

    if (needsMoreSupporting && point.assessment !== "SUPPORTING") {
      targetAssessment = "SUPPORTING";
    } else if (needsMoreContradicting && point.assessment !== "CONTRADICTING") {
      targetAssessment = "CONTRADICTING";
    } else if (needsMixed && point.assessment !== "NEUTRAL") {
      targetAssessment = i % 3 === 0 ? "SUPPORTING" : i % 3 === 1 ? "CONTRADICTING" : "NEUTRAL";
    }

    if (!targetAssessment) continue;

    let newValue: number;
    if (targetAssessment === "SUPPORTING") {
      newValue = successMin ?? (parseNumericValue(point.value) ?? 1) + 1;
    } else if (targetAssessment === "CONTRADICTING") {
      newValue =
        failureMax !== null
          ? Math.max(0, failureMax - 1)
          : Math.max(0, (parseNumericValue(point.value) ?? 1) - 1);
    } else {
      const mid =
        successMin !== null && failureMax !== null
          ? (successMin + failureMax) / 2
          : parseNumericValue(point.value) ?? 1;
      newValue = mid;
    }

    adjusted[i] = {
      ...point,
      value: formatIncrement(newValue, suffix, asPercent),
      assessment: assessValue(
        newValue,
        metric.successCriterion,
        metric.failureCriterion
      ),
    };

    const newSupporting = adjusted.filter(
      (p) => p.assessment === "SUPPORTING"
    ).length;
    const newContradicting = adjusted.filter(
      (p) => p.assessment === "CONTRADICTING"
    ).length;

    if (needsMoreSupporting && newSupporting >= majority) break;
    if (needsMoreContradicting && newContradicting >= majority) break;
    if (
      needsMixed &&
      newSupporting < majority &&
      newContradicting < majority
    ) {
      if (i === adjusted.length - 1) break;
    }
  }

  return reassessDataPoints(metric, adjusted);
}

/** Align simulated KPI series with the chosen scenario at the evaluation level. */
export function adjustSimulationForScenario<T extends KpiPoint>(
  metric: MetricForAssessment,
  points: T[],
  scenario: KpiScenario
): T[] {
  const mode = resolveEvaluationMode(metric);

  if (mode === "CUMULATIVE") {
    const adjusted = adjustCumulativeSeries(metric, points, scenario);
    const periodAssessment = derivePeriodAssessment(metric, adjusted);
    return adjusted.map((point, index) => ({
      ...point,
      assessment:
        index === adjusted.length - 1 ? periodAssessment : "NEUTRAL",
    }));
  }

  return adjustPerPointSeries(metric, points, scenario);
}
