import type {
  EvaluationMode,
  MetricRole,
  ProxyStrength,
  SignalCategory,
  StepType,
  StrategyDimension,
  TestSubject,
} from "@prisma/client";
import type { StatementData } from "@/components/statements/types";
import type { StepReadinessInput } from "@/lib/cockpitPeriod";

export type AssistantTaskData = {
  id: string;
  text: string;
  erfolgskriterium: string | null;
  annahmenBezugId: string | null;
};

export type MetricData = {
  id: string;
  name: string;
  evaluationMode: EvaluationMode;
  metricRole: MetricRole;
  signalCategory: SignalCategory | null;
  proxyStrength: ProxyStrength | null;
  signalRationale: string | null;
  successCriterion: string;
  failureCriterion: string;
};

export type StepData = {
  id: string;
  projectId: string;
  optionId: string;
  assumptionId: string;
  title: string;
  description: string;
  validationQuestion: string | null;
  testDesign: string | null;
  marketingActivities: string[] | null;
  channel: string | null;
  timeframe: string | null;
  budgetFrame: string | null;
  stepType: StepType;
  strategyDimension: StrategyDimension | null;
  testSubject: TestSubject | null;
  methodWarning: string | null;
  adopted: boolean;
  discardedAt: string | null;
  metrics: MetricData[];
  taskProgress?: { done: number; total: number } | null;
  cockpitReadinessInput?: StepReadinessInput;
  assistantTasks?: AssistantTaskData[];
  hasKpiDataPoints?: boolean;
};

export type StepWithAssumption = StepData & { assumption: StatementData };

export type PrioritizedOptionData = {
  id: string;
  title: string;
  summary: string | null;
  prioritizationRationale: string | null;
};

/** Parse marketingActivities from API (Json) for client use. */
export function parseMarketingActivities(
  value: unknown
): string[] | null {
  if (!Array.isArray(value)) return null;
  const items = value.filter((item) => typeof item === "string");
  return items.length > 0 ? items : null;
}

/** Normalize API step payloads (Json fields, legacy metrics without role). */
export function normalizeStepFromApi<T extends StepData>(
  step: T & { marketingActivities?: unknown; stepType?: StepType }
): T {
  return {
    ...step,
    stepType: step.stepType ?? "VALIDATION",
    strategyDimension: step.strategyDimension ?? null,
    testSubject: step.testSubject ?? null,
    methodWarning: step.methodWarning ?? null,
    marketingActivities: parseMarketingActivities(step.marketingActivities),
    metrics: step.metrics.map((metric) => ({
      ...metric,
      metricRole: metric.metricRole ?? "DECISIVE",
      signalCategory: metric.signalCategory ?? null,
      proxyStrength: metric.proxyStrength ?? null,
      signalRationale: metric.signalRationale ?? null,
    })),
  };
}

export type Phase4GenerationMeta = {
  diversityNote: string | null;
  modeNote: string | null;
  emptyState: string | null;
};
