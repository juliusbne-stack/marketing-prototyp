import type {
  AggregationStrategy,
  EvaluationMode,
  MetricValueType,
} from "@prisma/client";
import { DEMO_FIXTURE } from "@/scripts/demo-fixture-data";
import { demoDelay } from "@/lib/demo/delay";
import {
  type KpiDataPointInput,
  type KpiScenario,
  type KpiSimulationResponse,
} from "@/lib/schemas/kpiSimulation";
import { metricEvaluationConfigSchema } from "@/lib/schemas/metric";

type MetricForSim = {
  id: string;
  name: string;
  evaluationMode: EvaluationMode | null;
  valueType: MetricValueType | null;
  aggregationStrategy: AggregationStrategy | null;
  evaluationConfig: unknown;
};

function expectsRatio(metric: MetricForSim): boolean {
  return (
    metric.aggregationStrategy === "RATE_FROM_SUMS" ||
    metric.valueType === "COUNT_OF_TOTAL"
  );
}

function periodPrefix(existing: string[]): { prefix: string; nextIndex: number } {
  const last = existing[existing.length - 1];
  if (last) {
    const match = last.match(/^(Welle|Woche|Periode|Tag)\s+(\d+)\b/i);
    if (match) {
      return {
        prefix: match[1]!.charAt(0).toUpperCase() + match[1]!.slice(1).toLowerCase(),
        nextIndex: Number(match[2]) + 1,
      };
    }
  }
  return { prefix: "Welle", nextIndex: existing.length + 1 };
}

function nextPeriodLabels(existing: string[], count: number): string[] {
  const { prefix, nextIndex } = periodPrefix(existing);
  return Array.from({ length: count }, (_, i) => `${prefix} ${nextIndex + i}`);
}

function scenarioBias(scenario: KpiScenario): number {
  if (scenario === "SUPPORTING") return 1;
  if (scenario === "CONTRADICTING") return 0;
  return 0.5;
}

function buildRatioPoints(
  metric: MetricForSim,
  periodLabels: string[],
  scenario: KpiScenario
): KpiDataPointInput[] {
  const config = metricEvaluationConfigSchema.safeParse(metric.evaluationConfig);
  const required =
    config.success && config.data.requiredDenominator
      ? config.data.requiredDenominator
      : 18;
  const perPeriod = Math.max(1, Math.round(required / periodLabels.length));
  const bias = scenarioBias(scenario);

  let successNum = Math.ceil(required * 0.7);
  let failureNum = Math.floor(required * 0.3);
  if (config.success) {
    if (config.data.success.numerator !== undefined) {
      successNum = config.data.success.numerator;
    }
    if (config.data.failure.numerator !== undefined) {
      failureNum = config.data.failure.numerator;
    }
  }

  const targetTotal = Math.round(
    failureNum + (successNum - failureNum) * bias
  );

  const points: KpiDataPointInput[] = [];
  let prior = 0;
  for (let index = 0; index < periodLabels.length; index++) {
    const periodLabel = periodLabels[index]!;
    const isLast = index === periodLabels.length - 1;
    const remainingPeriods = periodLabels.length - index;
    let numerator: number;
    if (isLast) {
      numerator = Math.max(0, targetTotal - prior);
    } else {
      const fairShare = Math.round((targetTotal - prior) / remainingPeriods);
      numerator = Math.max(0, Math.min(perPeriod, fairShare));
    }
    numerator = Math.min(perPeriod, numerator);
    points.push({
      periodLabel,
      numerator,
      denominator: perPeriod,
      assessment: "NEUTRAL",
    });
    prior += numerator;
  }

  return points;
}

function buildScalarPoints(
  metric: MetricForSim,
  periodLabels: string[],
  scenario: KpiScenario
): KpiDataPointInput[] {
  const config = metricEvaluationConfigSchema.safeParse(metric.evaluationConfig);
  const bias = scenarioBias(scenario);
  let success = 10;
  let failure = 5;
  if (config.success) {
    const s = config.data.success;
    const f = config.data.failure;
    success = s.percentage ?? s.value ?? success;
    failure = f.percentage ?? f.value ?? failure;
  }

  // Prefer fixture scalar when names match (SUPPORTING-aligned demo values).
  const fixtureMetric = Object.values(DEMO_FIXTURE.metrics).find(
    (entry) => entry.name === metric.name
  );
  if (fixtureMetric && scenario === "SUPPORTING") {
    const fixturePoints = fixtureMetric.kpiPointKeys
      .map((key) => DEMO_FIXTURE.kpiPoints[key])
      .filter((point) => point && point.value != null);
    if (fixturePoints.length > 0) {
      const base = Number(String(fixturePoints[0]!.value).replace(",", "."));
      if (Number.isFinite(base)) {
        return periodLabels.map((periodLabel, index) => ({
          periodLabel,
          value: Math.max(0, base + (index - (periodLabels.length - 1)) * 0.3),
          assessment: "NEUTRAL" as const,
        }));
      }
    }
  }

  const target = failure + (success - failure) * bias;
  return periodLabels.map((periodLabel, index) => ({
    periodLabel,
    value: Math.max(
      0,
      target + (index - (periodLabels.length - 1) / 2) * (target * 0.05)
    ),
    assessment: "NEUTRAL" as const,
  }));
}

/**
 * Deterministic KPI simulation for the Nouriva demo — no OpenAI call.
 * Returns a schema-valid payload; the route still adjusts/validates/persists.
 */
export async function serveDemoKpiSimulation(
  metrics: MetricForSim[],
  scenario: KpiScenario,
  existingPeriodLabelsByMetric: Record<string, string[]>
): Promise<KpiSimulationResponse> {
  await demoDelay(700);

  const sharedExisting =
    metrics.length > 0
      ? (existingPeriodLabelsByMetric[metrics[0]!.id] ?? [])
      : [];
  const periodLabels = nextPeriodLabels(sharedExisting, 3);

  return {
    series: metrics.map((metric) => {
      const existing = existingPeriodLabelsByMetric[metric.id] ?? sharedExisting;
      const labels =
        existing === sharedExisting
          ? periodLabels
          : nextPeriodLabels(existing, 3);
      const points = expectsRatio(metric)
        ? buildRatioPoints(metric, labels, scenario)
        : buildScalarPoints(metric, labels, scenario);
      return { metricId: metric.id, points };
    }),
  };
}
