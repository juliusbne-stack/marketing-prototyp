import type { FeedbackResult } from "@prisma/client";
import type { StepWithAssumption } from "@/components/phase4/types";
import type { FeedbackData } from "@/components/phase5/types";
import {
  isStepReadyForFeedback,
  type StepReadinessInput,
} from "@/lib/cockpitPeriod";

type StepRef = Pick<StepWithAssumption, "id" | "adopted">;
type FeedbackRef = Pick<FeedbackData, "stepId" | "interpretation" | "statusApplied">;
type AssessedFeedbackRef = Pick<
  FeedbackData,
  "statementId" | "result" | "interpretation"
>;

export type ValidationHistoryCounts = Partial<Record<FeedbackResult, number>>;

const RESULT_HISTORY_ORDER: FeedbackResult[] = [
  "SUPPORTED",
  "PARTIALLY_SUPPORTED",
  "REFUTED",
  "AMBIGUOUS",
];

export const VALIDATION_HISTORY_LABELS: Record<FeedbackResult, string> = {
  SUPPORTED: "gestützt",
  PARTIALLY_SUPPORTED: "teilweise",
  REFUTED: "widerlegt",
  AMBIGUOUS: "mehrdeutig",
};

/** Count assessed feedbacks (interpretation set) per result for one statement. */
export function getValidationHistoryCounts(
  statementId: string,
  feedbacks: AssessedFeedbackRef[]
): ValidationHistoryCounts | null {
  const counts: ValidationHistoryCounts = {};

  for (const feedback of feedbacks) {
    if (feedback.statementId !== statementId || feedback.interpretation === null) {
      continue;
    }
    counts[feedback.result] = (counts[feedback.result] ?? 0) + 1;
  }

  return Object.keys(counts).length > 0 ? counts : null;
}

/** Map statementId → cumulative validation history across all assessment runs. */
export function buildValidationHistoryMap(
  feedbacks: AssessedFeedbackRef[]
): Map<string, ValidationHistoryCounts> {
  const map = new Map<string, ValidationHistoryCounts>();

  for (const feedback of feedbacks) {
    if (feedback.interpretation === null) continue;

    const existing = map.get(feedback.statementId) ?? {};
    existing[feedback.result] = (existing[feedback.result] ?? 0) + 1;
    map.set(feedback.statementId, existing);
  }

  return map;
}

export function getValidationHistorySegments(
  counts: ValidationHistoryCounts
): { result: FeedbackResult; count: number; label: string }[] {
  return RESULT_HISTORY_ORDER.flatMap((result) => {
    const count = counts[result];
    if (!count) return [];
    return [{ result, count, label: `${count}× ${VALIDATION_HISTORY_LABELS[result]}` }];
  });
}

/** A step is completed when at least one feedback has been assessed (interpretation set). */
export function isStepCompleted(
  stepId: string,
  feedbacks: FeedbackRef[]
): boolean {
  return feedbacks.some(
    (feedback) => feedback.stepId === stepId && feedback.interpretation !== null
  );
}

/** A critical assumption is completed when all its adopted steps are completed. */
export function isAssumptionCompleted(
  steps: StepRef[],
  feedbacks: FeedbackRef[]
): boolean {
  const adoptedSteps = steps.filter((step) => step.adopted);
  if (adoptedSteps.length === 0) return false;
  return adoptedSteps.every((step) => isStepCompleted(step.id, feedbacks));
}

export function hasDraftSteps(steps: Pick<StepWithAssumption, "adopted">[]): boolean {
  return steps.some((step) => !step.adopted);
}

/** Previously validated = all adopted steps assessed and no pending draft steps. */
export function isAssumptionPreviouslyValidated(
  steps: StepWithAssumption[],
  feedbacks: FeedbackRef[]
): boolean {
  return isAssumptionCompleted(steps, feedbacks) && !hasDraftSteps(steps);
}

export function getAssessedFeedbackForStep(
  stepId: string,
  feedbacks: FeedbackData[]
): FeedbackData | undefined {
  return feedbacks.find(
    (feedback) => feedback.stepId === stepId && feedback.interpretation !== null
  );
}

const OPEN_VALIDATION_DRAFT_INTRO =
  "Prüfe die Entwürfe, passe sie bei Bedarf an und übernimm die Schritte in den Projektstand — die Umsetzung erfolgt danach im Umsetzungs-Cockpit.";

const OPEN_VALIDATION_ADOPTED_INTRO =
  "Alle Schritte sind übernommen — setze sie im Umsetzungs-Cockpit um und gehe anschließend zu Phase 5 für die Auswertung.";

/** Subtitle for the phase 4 "Offene Validierung" section, derived from open steps. */
export function getOpenValidationIntro(
  openSteps: (StepWithAssumption & {
    cockpitReadinessInput?: StepReadinessInput;
  })[],
  feedbacks: FeedbackRef[],
  hasDrafts: boolean
): string {
  if (hasDrafts) {
    return OPEN_VALIDATION_DRAFT_INTRO;
  }

  const activeSteps = openSteps.filter(
    (step) => !isStepCompleted(step.id, feedbacks)
  );
  const readyCount = activeSteps.filter(
    (step) =>
      step.cockpitReadinessInput &&
      isStepReadyForFeedback(
        step.cockpitReadinessInput,
        isStepCompleted(step.id, feedbacks)
      )
  ).length;
  const total = activeSteps.length;

  if (readyCount === 0) {
    return OPEN_VALIDATION_ADOPTED_INTRO;
  }
  if (readyCount < total) {
    return `${readyCount} von ${total} Schritten sind bereit für Rückmeldung — erfasse sie im Umsetzungs-Cockpit.`;
  }
  return "Alle Schritte sind umgesetzt — erfasse die Rückmeldungen im Umsetzungs-Cockpit und werte sie anschließend in Phase 5 aus.";
}
