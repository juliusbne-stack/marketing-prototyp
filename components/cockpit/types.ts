import type { EvidenceStatus, FeedbackResult, KpiAssessment } from "@prisma/client";

// Client-side shapes of the implementation cockpit, matching
// app/project/[id]/cockpit/page.tsx and the /api/tasks + /api/kpi routes.

export type TaskData = {
  id: string;
  stepId: string;
  title: string;
  hint: string | null;
  sortOrder: number;
  done: boolean;
};

export type KpiDataPointData = {
  id: string;
  metricId: string;
  periodLabel: string;
  value: string;
  assessment: KpiAssessment;
};

export type CockpitMetricData = {
  id: string;
  name: string;
  successCriterion: string;
  failureCriterion: string;
  dataPoints: KpiDataPointData[];
};

export type CockpitStepData = {
  id: string;
  title: string;
  description: string;
  channel: string | null;
  assumptionContent: string;
  assumptionEvidenceStatus: EvidenceStatus;
  timeframe: string | null;
  budgetFrame: string | null;
  metrics: CockpitMetricData[];
  tasks: TaskData[];
  // A MarketFeedback for this step already exists in phase 5.
  hasFeedback: boolean;
  feedbackEvaluated: boolean;
  feedbackResult: FeedbackResult | null;
};

const KPI_INDICATOR_SEVERITY: Record<KpiAssessment, number> = {
  SUPPORTING: 0,
  NEUTRAL: 1,
  CONTRADICTING: 2,
};

// One dot per step: worst assessment among each metric's latest data point.
export function getStepKpiIndicator(
  step: CockpitStepData
): KpiAssessment | null {
  const latestPerMetric = step.metrics
    .map((metric) => metric.dataPoints.at(-1))
    .filter((point): point is KpiDataPointData => point !== undefined);

  if (latestPerMetric.length === 0) return null;

  return latestPerMetric.reduce((worst, point) =>
    KPI_INDICATOR_SEVERITY[point.assessment] >
    KPI_INDICATOR_SEVERITY[worst.assessment]
      ? point
      : worst
  ).assessment;
}

// KPI chip/dot styling — deliberately NOT the reserved evidence colors.
export const KPI_ASSESSMENT_CONFIG: Record<
  KpiAssessment,
  { label: string; chipClassName: string; dotClassName: string }
> = {
  SUPPORTING: {
    label: "stützend",
    chipClassName: "bg-kpi-supporting-bg text-kpi-supporting-text",
    dotClassName: "bg-kpi-supporting-text",
  },
  NEUTRAL: {
    label: "neutral",
    chipClassName: "border border-border bg-background text-text-muted",
    dotClassName: "bg-text-muted/50",
  },
  CONTRADICTING: {
    label: "widersprechend",
    chipClassName: "bg-kpi-contradicting-bg text-kpi-contradicting-text",
    dotClassName: "bg-kpi-contradicting-text",
  },
};
