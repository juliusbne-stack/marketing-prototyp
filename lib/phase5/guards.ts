import type { EvidenceStatus, FeedbackResult, ProxyStrength } from "@prisma/client";
import type { Phase5Response } from "@/lib/schemas/phase5";

export const PROXY_DAMPEN_NOTE =
  "Beleg beruht auf einem indirekten Signal (Proxy); für einen Fakt wäre ein direkter Nutzungs-/Zahlungsnachweis nötig.";

export type StepMetricForProxyGuard = {
  metricRole: string;
  proxyStrength: ProxyStrength | null;
};

export type StepForProxyGuard = {
  id: string;
  assumption: { id: string };
  metrics: StepMetricForProxyGuard[];
};

export type FeedbackRefForProxyGuard = {
  id: string;
  stepId: string | null;
  statementId: string;
};

export type DampenedAssessment = Phase5Response["feedbackAssessments"][number] & {
  proxyDamped?: boolean;
};

/** True when every DECISIVE metric is PROXY (and at least one DECISIVE exists). */
export function isProxyOnlyDecisiveStep(step: StepForProxyGuard): boolean {
  const decisive = step.metrics.filter(
    (metric) => metric.metricRole === "DECISIVE"
  );
  if (decisive.length === 0) return false;
  return decisive.every((metric) => metric.proxyStrength === "PROXY");
}

export function wasProxyDamped(interpretation: string | null): boolean {
  return interpretation?.includes(PROXY_DAMPEN_NOTE) ?? false;
}

function resolveStepForFeedback(
  feedback: FeedbackRefForProxyGuard,
  steps: StepForProxyGuard[]
): StepForProxyGuard | undefined {
  if (feedback.stepId) {
    const byStep = steps.find((step) => step.id === feedback.stepId);
    if (byStep) return byStep;
  }
  return steps.find((step) => step.assumption.id === feedback.statementId);
}

/**
 * Caps SUPPORTED → PARTIALLY_SUPPORTED and FACT proposals when DECISIVE evidence
 * is exclusively PROXY. Deterministic post-LLM guard (Stufe 3b).
 */
export function dampenProxyResults(
  assessments: Phase5Response["feedbackAssessments"],
  steps: StepForProxyGuard[],
  feedbacks: FeedbackRefForProxyGuard[]
): DampenedAssessment[] {
  const feedbackById = new Map(feedbacks.map((feedback) => [feedback.id, feedback]));

  return assessments.map((assessment) => {
    const feedback = feedbackById.get(assessment.feedbackId);
    if (!feedback) {
      return assessment;
    }

    const step = resolveStepForFeedback(feedback, steps);
    if (!step || !isProxyOnlyDecisiveStep(step)) {
      return assessment;
    }

    let result: FeedbackResult = assessment.result;
    let proposedNewStatus: EvidenceStatus | null | undefined =
      assessment.proposedNewStatus ?? null;
    let interpretation = assessment.interpretation;

    const resultChanged = result === "SUPPORTED";
    const statusChanged = proposedNewStatus === "FACT";

    if (!resultChanged && !statusChanged) {
      return assessment;
    }

    if (resultChanged) {
      result = "PARTIALLY_SUPPORTED";
    }
    if (statusChanged) {
      proposedNewStatus = "ASSUMPTION";
    }

    if (resultChanged && !wasProxyDamped(interpretation)) {
      interpretation = `${interpretation.trim()} ${PROXY_DAMPEN_NOTE}`;
    }

    return {
      ...assessment,
      result,
      proposedNewStatus,
      interpretation,
      proxyDamped: true,
    };
  });
}
