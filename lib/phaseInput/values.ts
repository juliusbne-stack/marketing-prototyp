import { PHASE2_QUESTIONS } from "./phase2Questions";
import { P4_VALIDATION_METHODS, PHASE4_QUESTIONS } from "./phase4Questions";
import type {
  AssetsValue,
  BudgetZeitValue,
  KapazitaetValue,
  KernangebotValue,
  MethodPreference,
  OnboardingMeta,
  PhaseInputAnswer,
  PhaseInputPhase,
  PhaseInputQuestion,
  PhaseInputRecord,
  PhaseInputState,
} from "./types";
import { ONBOARDING_META_KEY } from "./types";

export function getQuestionsForPhase(phase: PhaseInputPhase): PhaseInputQuestion[] {
  return phase === 2 ? PHASE2_QUESTIONS : PHASE4_QUESTIONS;
}

export function defaultAnswerForQuestion(
  question: PhaseInputQuestion
): PhaseInputAnswer {
  switch (question.inputType) {
    case "textarea":
    case "text":
      return { value: "", skipped: false };
    case "choice":
      return { value: "", skipped: false };
    case "kernangebot":
      return {
        value: { mode: "fix", detail: "" } satisfies KernangebotValue,
        skipped: false,
      };
    case "methodMatrix":
      return {
        value: Object.fromEntries(
          question.methods.map((method) => [method.id, "egal" as MethodPreference])
        ),
        skipped: false,
      };
    case "budgetZeit":
      return {
        value: {
          budgetEur: null,
          budgetSkipped: false,
          weeks: null,
          weeksSkipped: false,
        } satisfies BudgetZeitValue,
        skipped: false,
      };
    case "multiCheckbox":
      return {
        value: { selected: [], sonstiges: "" } satisfies AssetsValue,
        skipped: false,
      };
    case "kapazitaet":
      return {
        value: {
          team: "allein",
          skills: [],
        } satisfies KapazitaetValue,
        skipped: false,
      };
    default:
      return { value: null, skipped: false };
  }
}

export function defaultPhaseInputState(phase: PhaseInputPhase): PhaseInputState {
  const answers: Record<string, PhaseInputAnswer> = {};
  for (const question of getQuestionsForPhase(phase)) {
    answers[question.key] = defaultAnswerForQuestion(question);
  }
  return {
    onboarding: { stepIndex: 0, complete: false },
    answers,
  };
}

export function recordsToState(
  phase: PhaseInputPhase,
  records: PhaseInputRecord[]
): PhaseInputState {
  const state = defaultPhaseInputState(phase);
  const metaRecord = records.find(
    (record) => record.questionKey === ONBOARDING_META_KEY
  );
  if (metaRecord?.value && typeof metaRecord.value === "object") {
    const meta = metaRecord.value as Partial<OnboardingMeta>;
    state.onboarding = {
      stepIndex:
        typeof meta.stepIndex === "number"
          ? Math.max(0, Math.min(meta.stepIndex, getQuestionsForPhase(phase).length - 1))
          : 0,
      complete: Boolean(meta.complete),
    };
  }

  for (const record of records) {
    if (record.questionKey === ONBOARDING_META_KEY) continue;
    if (state.answers[record.questionKey]) {
      state.answers[record.questionKey] = {
        value: record.skipped ? null : record.value,
        skipped: record.skipped,
      };
    }
  }
  return state;
}

export function isOnboardingNeeded(state: PhaseInputState): boolean {
  return !state.onboarding.complete;
}

export function getResumeStep(state: PhaseInputState): number {
  return state.onboarding.stepIndex;
}

export function answerToDisplayText(
  question: PhaseInputQuestion,
  answer: PhaseInputAnswer
): string | null {
  if (answer.skipped) return null;
  const { value } = answer;
  if (value == null) return null;

  switch (question.inputType) {
    case "textarea":
    case "text":
    case "choice":
      return typeof value === "string" && value.trim() ? value.trim() : null;
    case "kernangebot": {
      const v = value as KernangebotValue;
      const modeLabel =
        v.mode === "fix" ? "Fix gesetzt" : "Offen für Varianten";
      return v.detail?.trim()
        ? `${modeLabel}: ${v.detail.trim()}`
        : modeLabel;
    }
    case "methodMatrix": {
      const prefs = value as Record<string, MethodPreference>;
      const parts = P4_VALIDATION_METHODS.map((method) => {
        const pref = prefs[method.id] ?? "egal";
        if (pref === "egal") return null;
        return `${method.label}: ${pref}`;
      }).filter(Boolean);
      return parts.length > 0 ? parts.join(", ") : "Alle offen";
    }
    case "budgetZeit": {
      const v = value as BudgetZeitValue;
      const parts: string[] = [];
      if (!v.budgetSkipped && v.budgetEur != null) {
        parts.push(`${v.budgetEur} €`);
      }
      if (!v.weeksSkipped && v.weeks != null) {
        parts.push(`${v.weeks} Wochen`);
      }
      return parts.length > 0 ? parts.join(", ") : null;
    }
    case "multiCheckbox": {
      const v = value as AssetsValue;
      const items = [...v.selected];
      if (v.sonstiges?.trim()) items.push(v.sonstiges.trim());
      return items.length > 0 ? items.join(", ") : null;
    }
    case "kapazitaet": {
      const v = value as KapazitaetValue;
      const skills =
        v.skills.length > 0 ? ` — ${v.skills.join(", ")}` : "";
      return `${v.team}${skills}`;
    }
    default:
      return null;
  }
}

export function stateToUpsertPayload(
  projectId: string,
  phase: PhaseInputPhase,
  state: PhaseInputState
): Array<{
  projectId: string;
  phase: number;
  questionKey: string;
  value: unknown;
  skipped: boolean;
}> {
  const payload: Array<{
    projectId: string;
    phase: number;
    questionKey: string;
    value: unknown;
    skipped: boolean;
  }> = [
    {
      projectId,
      phase,
      questionKey: ONBOARDING_META_KEY,
      value: state.onboarding,
      skipped: false,
    },
  ];

  for (const [questionKey, answer] of Object.entries(state.answers)) {
    payload.push({
      projectId,
      phase,
      questionKey,
      value: answer.skipped ? null : answer.value,
      skipped: answer.skipped,
    });
  }
  return payload;
}

export function hasAnswerContent(
  question: PhaseInputQuestion,
  answer: PhaseInputAnswer
): boolean {
  return answerToDisplayText(question, answer) != null;
}

/** Wizard saves only visited questions — avoids validating empty defaults for future steps. */
export function buildWizardSaveEntries(
  phase: PhaseInputPhase,
  state: PhaseInputState
): Array<{ questionKey: string; value: unknown; skipped: boolean }> {
  const questions = getQuestionsForPhase(phase);
  const endIndex = state.onboarding.complete
    ? questions.length
    : Math.max(0, state.onboarding.stepIndex);

  return questions.slice(0, endIndex).map((question) => {
    const answer =
      state.answers[question.key] ?? defaultAnswerForQuestion(question);
    return {
      questionKey: question.key,
      value: answer.skipped ? null : answer.value,
      skipped: answer.skipped,
    };
  });
}
