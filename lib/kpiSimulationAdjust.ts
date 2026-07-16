import type { KpiScenario } from "@/lib/schemas/kpiSimulation";
import type { KpiDataPointInput } from "@/lib/schemas/kpiSimulation";
import {
  metricEvaluationConfigSchema,
  type MetricEvaluationConfig,
} from "@/lib/schemas/metric";
import type { MetricAggregationInput } from "@/lib/metrics/aggregateMetric";

function ruleTarget(
  rule: MetricEvaluationConfig["success"],
  denominator?: number
): number | null {
  let target =
    rule.numerator ??
    rule.value ??
    (rule.percentage !== undefined && denominator !== undefined
      ? (rule.percentage / 100) * denominator
      : rule.ratio !== undefined && denominator !== undefined
        ? rule.ratio * denominator
        : null);
  if (target === null) return null;
  if (rule.operator === "GT") target += 1;
  if (rule.operator === "LT") target -= 1;
  return target;
}

function scenarioTarget(
  config: MetricEvaluationConfig,
  scenario: KpiScenario,
  denominator?: number
): number | null {
  const success = ruleTarget(config.success, denominator);
  const failure = ruleTarget(config.failure, denominator);
  if (scenario === "SUPPORTING") return success;
  if (scenario === "CONTRADICTING") return failure;
  return success !== null && failure !== null
    ? (success + failure) / 2
    : null;
}

function adjustRatioSeries(
  points: KpiDataPointInput[],
  config: MetricEvaluationConfig,
  scenario: KpiScenario
): KpiDataPointInput[] {
  if (points.length === 0) return points;
  const adjusted = points.map((point) => ({ ...point }));
  const lastIndex = adjusted.length - 1;
  const previous = adjusted.slice(0, lastIndex);
  const previousDenominator = previous.reduce(
    (sum, point) => sum + (point.denominator ?? 0),
    0
  );
  const previousNumerator = previous.reduce(
    (sum, point) => sum + (point.numerator ?? 0),
    0
  );
  const currentLast = adjusted[lastIndex]!;
  const requiredDenominator = config.requiredDenominator ?? 0;
  const lastDenominator = Math.max(
    currentLast.denominator ?? 1,
    requiredDenominator - previousDenominator,
    1
  );
  const totalDenominator = previousDenominator + lastDenominator;
  const target = scenarioTarget(config, scenario, totalDenominator);
  if (target === null) return adjusted;
  const lastNumerator = Math.min(
    lastDenominator,
    Math.max(0, Math.round(target - previousNumerator))
  );
  adjusted[lastIndex] = {
    periodLabel: currentLast.periodLabel,
    numerator: lastNumerator,
    denominator: lastDenominator,
    assessment: "NEUTRAL",
  };
  return adjusted;
}

function adjustScalarSeries(
  metric: MetricAggregationInput,
  points: KpiDataPointInput[],
  config: MetricEvaluationConfig,
  scenario: KpiScenario
): KpiDataPointInput[] {
  if (points.length === 0) return points;
  const adjusted = points.map((point) => ({ ...point }));
  const target = scenarioTarget(config, scenario);
  if (target === null) return adjusted;
  const lastIndex = adjusted.length - 1;
  const previous = adjusted.slice(0, lastIndex);
  const previousSum = previous.reduce(
    (sum, point) => sum + (point.value ?? 0),
    0
  );
  let lastValue = target;
  if (metric.aggregationStrategy === "SUM") {
    lastValue = target - previousSum;
  } else if (metric.aggregationStrategy === "AVERAGE") {
    lastValue = target * adjusted.length - previousSum;
  }
  adjusted[lastIndex] = {
    periodLabel: adjusted[lastIndex]!.periodLabel,
    value: Math.max(0, lastValue),
    assessment: "NEUTRAL",
  };
  return adjusted;
}

function adjustLatestRatioSeries(
  points: KpiDataPointInput[],
  config: MetricEvaluationConfig,
  scenario: KpiScenario
): KpiDataPointInput[] {
  if (points.length === 0) return points;
  const adjusted = points.map((point) => ({ ...point }));
  const lastIndex = adjusted.length - 1;
  const currentLast = adjusted[lastIndex]!;
  const denominator = Math.max(
    config.requiredDenominator ?? currentLast.denominator ?? 1,
    1
  );
  const target = scenarioTarget(config, scenario, denominator);
  if (target === null) return adjusted;
  adjusted[lastIndex] = {
    periodLabel: currentLast.periodLabel,
    numerator: Math.min(denominator, Math.max(0, Math.round(target))),
    denominator,
    assessment: "NEUTRAL",
  };
  return adjusted;
}

function expectsRatioAdjust(metric: MetricAggregationInput): boolean {
  return (
    metric.aggregationStrategy === "RATE_FROM_SUMS" ||
    metric.valueType === "COUNT_OF_TOTAL"
  );
}

/** Align generated values with structured rules. Free-text criteria are never parsed. */
export function adjustSimulationForScenario(
  metric: MetricAggregationInput,
  points: KpiDataPointInput[],
  scenario: KpiScenario
): KpiDataPointInput[] {
  const parsed = metricEvaluationConfigSchema.safeParse(metric.evaluationConfig);
  if (!parsed.success) return points;
  if (!expectsRatioAdjust(metric)) {
    return adjustScalarSeries(metric, points, parsed.data, scenario);
  }
  return metric.aggregationStrategy === "RATE_FROM_SUMS"
    ? adjustRatioSeries(points, parsed.data, scenario)
    : adjustLatestRatioSeries(points, parsed.data, scenario);
}
