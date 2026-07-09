import type { CockpitMetricData, CockpitStepData, TaskData } from "@/components/cockpit/types";
import type { KpiDataPointData } from "@/components/cockpit/types";
import { countActionableTasks } from "@/lib/taskActionable";
import {
  derivePeriodAssessment,
  isCumulativeEarlySupporting,
  reassessDataPoints,
  resolveEvaluationMode,
} from "@/lib/kpiAssessment";

export type StepReadiness =
  | "IN_PROGRESS"
  | "READY_FOR_FEEDBACK"
  | "EARLY_SIGNALS";

export const STEP_READINESS_CONFIG: Record<
  StepReadiness,
  { label: string; className: string; tooltip?: string }
> = {
  IN_PROGRESS: {
    label: "In Umsetzung",
    className: "border border-border bg-background text-text-muted",
  },
  READY_FOR_FEEDBACK: {
    label: "Bereit für Rückmeldung",
    className: "bg-accent-soft text-accent",
  },
  EARLY_SIGNALS: {
    label: "Eindeutige Signale — früh auswerten möglich",
    className: "bg-cockpit-signal-bg text-cockpit-signal-text",
    tooltip:
      "Die Misserfolgskriterien werden klar gerissen — nach dem Lean-Prinzip kannst du die Umsetzung hier vorzeitig beenden und auswerten.",
  },
};

export const TIMEFRAME_ENDPOINT_TOOLTIP =
  "Geplanter Endpunkt dieser Umsetzung — im Prototyp beendest du die Periode durch das Erfassen der Rückmeldung.";

export function getLatestKpiPointsPerMetric(
  metrics: CockpitMetricData[]
): KpiDataPointData[] {
  return metrics
    .map((metric) => {
      const reassessed = reassessDataPoints(metric, metric.dataPoints);
      return reassessed.at(-1);
    })
    .filter((point): point is KpiDataPointData => point !== undefined);
}

export function allTasksDone(tasks: TaskData[]): boolean {
  const { done, total } = countActionableTasks(tasks);
  return total === 0 || done === total;
}

export function hasAnyKpiDataPoint(metrics: CockpitMetricData[]): boolean {
  return metrics.some((metric) => metric.dataPoints.length > 0);
}

/** Majority of PER_POINT metrics' latest data point is CONTRADICTING. */
export function isPredominantlyContradicting(metrics: CockpitMetricData[]): boolean {
  const perPointMetrics = metrics.filter(
    (metric) => resolveEvaluationMode(metric) === "PER_POINT"
  );
  if (perPointMetrics.length === 0) return false;

  const latest = perPointMetrics
    .map((metric) => {
      const reassessed = reassessDataPoints(metric, metric.dataPoints);
      return reassessed.at(-1);
    })
    .filter((point): point is KpiDataPointData => point !== undefined);

  if (latest.length === 0) return false;

  const contradicting = latest.filter(
    (point) => point.assessment === "CONTRADICTING"
  ).length;
  return contradicting > latest.length / 2;
}

/** CUMULATIVE: running total already exceeds success threshold (irreversible). */
export function hasCumulativeEarlySupporting(
  metrics: CockpitMetricData[]
): boolean {
  return metrics.some(
    (metric) =>
      resolveEvaluationMode(metric) === "CUMULATIVE" &&
      isCumulativeEarlySupporting(metric, metric.dataPoints)
  );
}

export function deriveStepReadiness(
  tasks: TaskData[],
  metrics: CockpitMetricData[],
  hasFeedback: boolean
): StepReadiness | null {
  if (hasFeedback) return null;

  if (isPredominantlyContradicting(metrics)) {
    return "EARLY_SIGNALS";
  }
  if (allTasksDone(tasks) && hasAnyKpiDataPoint(metrics)) {
    return "READY_FOR_FEEDBACK";
  }
  return "IN_PROGRESS";
}

/** Minimal cockpit snapshot for readiness derivation outside the cockpit view. */
export type StepReadinessInput = {
  tasks: Pick<TaskData, "done">[];
  metrics: {
    evaluationMode?: CockpitMetricData["evaluationMode"];
    name: string;
    successCriterion: string;
    failureCriterion: string;
    dataPoints: Pick<KpiDataPointData, "periodLabel" | "value" | "assessment">[];
  }[];
};

export function isStepReadyForFeedback(
  input: StepReadinessInput,
  hasFeedback: boolean
): boolean {
  return (
    deriveStepReadiness(
      input.tasks as TaskData[],
      input.metrics as CockpitMetricData[],
      hasFeedback
    ) === "READY_FOR_FEEDBACK"
  );
}

export function getImplementationPeriodProgress(steps: CockpitStepData[]): {
  withFeedback: number;
  total: number;
} {
  return {
    withFeedback: steps.filter((step) => step.hasFeedback).length,
    total: steps.length,
  };
}

const TIMEFRAME_UNIT_DAYS: { pattern: RegExp; multiplier: number }[] = [
  { pattern: /(\d+(?:[.,]\d+)?)\s*woche/i, multiplier: 7 },
  { pattern: /(\d+(?:[.,]\d+)?)\s*tag/i, multiplier: 1 },
  { pattern: /(\d+(?:[.,]\d+)?)\s*monat/i, multiplier: 30 },
];

function parseTimeframeToDays(timeframe: string): number | null {
  const normalized = timeframe.trim();
  for (const { pattern, multiplier } of TIMEFRAME_UNIT_DAYS) {
    const match = normalized.match(pattern);
    if (match) {
      const value = Number.parseFloat(match[1].replace(",", "."));
      if (Number.isFinite(value)) {
        return value * multiplier;
      }
    }
  }
  return null;
}

/** Longest timeframe string among steps still awaiting feedback. */
export function getLongestActiveTimeframe(steps: CockpitStepData[]): string | null {
  const active = steps.filter((step) => !step.hasFeedback);
  if (active.length === 0) return null;

  let longest: { label: string; days: number } | null = null;
  let fallback: string | null = null;

  for (const step of active) {
    if (!step.timeframe) continue;
    if (!fallback) fallback = step.timeframe;

    const days = parseTimeframeToDays(step.timeframe);
    if (days === null) continue;

    if (!longest || days > longest.days) {
      longest = { label: step.timeframe, days };
    }
  }

  return longest?.label ?? fallback;
}

export function allStepsHaveFeedback(steps: CockpitStepData[]): boolean {
  return steps.length > 0 && steps.every((step) => step.hasFeedback);
}

/** Period-level assessment for a metric (used by step KPI indicator). */
export function getMetricDisplayAssessment(
  metric: CockpitMetricData
): KpiDataPointData["assessment"] | null {
  if (metric.dataPoints.length === 0) return null;
  const reassessed = reassessDataPoints(metric, metric.dataPoints);

  if (resolveEvaluationMode(metric) === "CUMULATIVE") {
    return derivePeriodAssessment(metric, metric.dataPoints);
  }

  return reassessed.at(-1)?.assessment ?? null;
}
