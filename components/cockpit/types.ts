import type {
  EvaluationMode,
  EvidenceStatus,
  FeedbackResult,
  KpiAssessment,
  Laufmodus,
  TaskHerkunft,
} from "@prisma/client";
import type { TaskElaborationResponse } from "@/lib/schemas/taskElaboration";
import { getMetricDisplayAssessment } from "@/lib/cockpitPeriod";

// Client-side shapes of the implementation cockpit, matching
// app/project/[id]/cockpit/page.tsx and the /api/tasks + /api/kpi routes.

export type StatementRef = {
  id: string;
  content: string;
  evidenceStatus: EvidenceStatus;
  displayNumber: number;
};

export type TaskData = {
  id: string;
  stepId: string;
  title: string;
  hint: string | null;
  sortOrder: number;
  done: boolean;
  annahmenBezugId: string | null;
  erfolgskriterium: string | null;
  elaboration: TaskElaborationResponse | null;
  elaborationGeneratedAt: string | null;
  herkunft: TaskHerkunft;
  erfuelltDurchUmsetzungId: string | null;
  erfuelltDurchUmsetzung: { id: string; title: string } | null;
};

export type StepBasisRef = {
  id: string;
  title: string;
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
  evaluationMode: EvaluationMode;
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
  laufmodus: Laufmodus;
  basiertAufUmsetzung: StepBasisRef | null;
  metrics: CockpitMetricData[];
  tasks: TaskData[];
  adoptedStatements: StatementRef[];
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

// One dot per step: worst period-level assessment across metrics.
export function getStepKpiIndicator(
  step: CockpitStepData
): KpiAssessment | null {
  const assessments = step.metrics
    .map((metric) => getMetricDisplayAssessment(metric))
    .filter((assessment): assessment is KpiAssessment => assessment !== null);

  if (assessments.length === 0) return null;

  return assessments.reduce((worst, assessment) =>
    KPI_INDICATOR_SEVERITY[assessment] > KPI_INDICATOR_SEVERITY[worst]
      ? assessment
      : worst
  );
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
