export type PhaseInputPhase = 2 | 4;

export const ONBOARDING_META_KEY = "_onboarding";

export type OnboardingMeta = {
  stepIndex: number;
  complete: boolean;
};

export type PhaseInputRecord = {
  questionKey: string;
  value: unknown;
  skipped: boolean;
};

export type PhaseInputState = {
  onboarding: OnboardingMeta;
  answers: Record<string, PhaseInputAnswer>;
};

export type PhaseInputAnswer = {
  value: unknown;
  skipped: boolean;
};

export type MethodPreference = "ja" | "nein" | "egal";

export type KernangebotValue = {
  mode: "fix" | "offen";
  detail?: string;
};

export type BudgetZeitValue = {
  budgetEur: number | null;
  budgetSkipped: boolean;
  weeks: number | null;
  weeksSkipped: boolean;
};

export type AssetsValue = {
  selected: string[];
  sonstiges?: string;
};

export type KapazitaetValue = {
  team: "allein" | "kleines Team";
  skills: string[];
};

export type PhaseInputQuestionBase = {
  key: string;
  label: string;
  question: string;
  hint?: string;
  promptLabel?: string;
  placeholder?: string;
  skippable: boolean;
};

export type PhaseInputQuestion =
  | (PhaseInputQuestionBase & {
      inputType: "textarea" | "text";
    })
  | (PhaseInputQuestionBase & {
      inputType: "choice";
      options: readonly string[];
    })
  | (PhaseInputQuestionBase & {
      inputType: "kernangebot";
    })
  | (PhaseInputQuestionBase & {
      inputType: "methodMatrix";
      methods: readonly { id: string; label: string }[];
    })
  | (PhaseInputQuestionBase & {
      inputType: "budgetZeit";
    })
  | (PhaseInputQuestionBase & {
      inputType: "multiCheckbox";
      options: readonly string[];
      sonstigesPlaceholder?: string;
    })
  | (PhaseInputQuestionBase & {
      inputType: "kapazitaet";
      skillOptions: readonly string[];
    });
