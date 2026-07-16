import type {
  EvaluationMode,
  MetricRole,
  ProxyStrength,
  SignalCategory,
  StepType,
  StrategyDimension,
  TestSubject,
  Laufmodus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseMarketingActivities } from "@/components/phase4/types";
import type { StatementData } from "@/components/statements/types";

const assumptionSelect = {
  id: true,
  projectId: true,
  phase: true,
  category: true,
  content: true,
  evidenceStatus: true,
  origin: true,
  justification: true,
  sourceRef: true,
  uncertainty: true,
  isCritical: true,
  adopted: true,
  segmentLabel: true,
  segmentAspect: true,
  competitorLabel: true,
  competitorAspect: true,
} as const;

export type ValidationStepDetailMetric = {
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

export type ValidationStepDetailData = {
  project: { id: string; name: string };
  option: { id: string; title: string };
  step: {
    id: string;
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
    laufmodus: Laufmodus;
    basiertAufUmsetzung: { id: string; title: string } | null;
  };
  assumption: StatementData;
  metrics: ValidationStepDetailMetric[];
};

const METRIC_ROLE_ORDER: Record<MetricRole, number> = {
  DECISIVE: 0,
  SUPPORTING: 1,
};

/** Read-only loader for the validation step detail view (screenshot / print). */
export async function loadValidationStepDetail(
  projectId: string,
  stepId: string
): Promise<ValidationStepDetailData | null> {
  const step = await prisma.validationStep.findFirst({
    where: { id: stepId, projectId },
    select: {
      id: true,
      title: true,
      description: true,
      validationQuestion: true,
      testDesign: true,
      marketingActivities: true,
      channel: true,
      timeframe: true,
      budgetFrame: true,
      stepType: true,
      strategyDimension: true,
      testSubject: true,
      methodWarning: true,
      laufmodus: true,
      project: { select: { id: true, name: true } },
      option: { select: { id: true, title: true } },
      assumption: { select: assumptionSelect },
      basiertAufUmsetzung: { select: { id: true, title: true } },
      metrics: {
        select: {
          id: true,
          name: true,
          evaluationMode: true,
          metricRole: true,
          signalCategory: true,
          proxyStrength: true,
          signalRationale: true,
          successCriterion: true,
          failureCriterion: true,
        },
      },
    },
  });

  if (!step) {
    return null;
  }

  const metrics = [...step.metrics].sort((a, b) => {
    const roleDiff = METRIC_ROLE_ORDER[a.metricRole] - METRIC_ROLE_ORDER[b.metricRole];
    if (roleDiff !== 0) return roleDiff;
    return a.name.localeCompare(b.name, "de");
  });

  return {
    project: step.project,
    option: step.option,
    assumption: step.assumption,
    metrics,
    step: {
      id: step.id,
      title: step.title,
      description: step.description,
      validationQuestion: step.validationQuestion,
      testDesign: step.testDesign,
      marketingActivities: parseMarketingActivities(step.marketingActivities),
      channel: step.channel,
      timeframe: step.timeframe,
      budgetFrame: step.budgetFrame,
      stepType: step.stepType,
      strategyDimension: step.strategyDimension,
      testSubject: step.testSubject,
      methodWarning: step.methodWarning,
      laufmodus: step.laufmodus,
      basiertAufUmsetzung: step.basiertAufUmsetzung,
    },
  };
}
