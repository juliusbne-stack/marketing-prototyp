export type ProfileData = {
  id: string;
  businessIdea: string | null;
  productStatus: string | null;
  assumedTarget: string | null;
  assumedProblem: string | null;
  valuePropDraft: string | null;
  revenueIdea: string | null;
  region: string | null;
  teamSize: number | null;
  budgetMonthly: string | null;
  timePerWeek: string | null;
  skills: string | null;
  existingInsights: string | null;
  profileOnboardingComplete?: boolean;
  profileOnboardingStep?: number;
};

export type ProfileFieldKey = Exclude<
  keyof ProfileData,
  "id" | "profileOnboardingComplete" | "profileOnboardingStep"
>;

export const PRODUCT_STATUS_OPTIONS = ["Idee", "MVP", "am Markt"] as const;
export const BUDGET_OPTIONS = ["unter 500 €", "500–2000 €", "über 2000 €"] as const;
export const TIME_OPTIONS = [
  "unter 5 Stunden",
  "5–10 Stunden",
  "10–20 Stunden",
  "über 20 Stunden",
] as const;

export type ProfileQuestion = {
  field: ProfileFieldKey;
  label: string;
  chapter: 1 | 2 | 3;
  chapterTitle: string;
  question: string;
  hint?: string;
  placeholder?: string;
  required: boolean;
  inputType: "textarea" | "text" | "choice" | "number";
  options?: readonly string[];
};

/** Ein Hinweis pro Kapitel — nur auf der ersten Frage sichtbar. */
export const CHAPTER_INTROS: Record<1 | 2 | 3, string> = {
  1: "Beschreibe dein Angebot — nur die Geschäftsidee ist Pflicht.",
  2: "In diesem Kapitel kannst du Annahmen machen — die Analyse prüft sie später.",
  3: "In diesem Kapitel kannst du Annahmen machen — die Analyse prüft sie später.",
};

export const PROFILE_QUESTIONS: ProfileQuestion[] = [
  {
    field: "businessIdea",
    label: "Geschäftsidee / Angebot",
    chapter: 1,
    chapterTitle: "Dein Angebot",
    question: "Was bietest du an, für wen, und was ist daran besonders?",
    placeholder:
      "Was bietest du an, für wen, und was ist daran besonders?",
    required: true,
    inputType: "textarea",
  },
  {
    field: "productStatus",
    label: "Produktstatus",
    chapter: 1,
    chapterTitle: "Dein Angebot",
    question: "In welchem Stadium ist dein Angebot gerade?",
    required: false,
    inputType: "choice",
    options: PRODUCT_STATUS_OPTIONS,
  },
  {
    field: "region",
    label: "Region / geplanter Markt",
    chapter: 1,
    chapterTitle: "Dein Angebot",
    question: "In welcher Region oder auf welchem Markt willst du starten?",
    placeholder: "z. B. Köln und Umgebung, DACH, online",
    required: false,
    inputType: "text",
  },
  {
    field: "assumedTarget",
    label: "Vermutete Zielgruppe",
    chapter: 2,
    chapterTitle: "Markt & Kunden",
    question: "Wer ist deine vermutete Zielgruppe?",
    hint: "Leer lassen ist okay — die KI schlägt Hypothesen vor.",
    placeholder:
      "Leer lassen, wenn noch unklar — die KI schlägt Zielgruppenhypothesen vor",
    required: false,
    inputType: "textarea",
  },
  {
    field: "assumedProblem",
    label: "Vermutetes Kundenproblem",
    chapter: 2,
    chapterTitle: "Markt & Kunden",
    question: "Welches Problem löst dein Angebot für diese Zielgruppe?",
    placeholder: "Welches Problem löst dein Angebot?",
    required: false,
    inputType: "textarea",
  },
  {
    field: "valuePropDraft",
    label: "Nutzenversprechen",
    chapter: 2,
    chapterTitle: "Markt & Kunden",
    question: "Warum sollten Kunden zu dir kommen — und nicht zur Alternative?",
    placeholder: "Warum sollten Kunden zu dir kommen?",
    required: false,
    inputType: "textarea",
  },
  {
    field: "revenueIdea",
    label: "Erlösidee",
    chapter: 2,
    chapterTitle: "Markt & Kunden",
    question: "Wie soll Geld verdient werden?",
    placeholder: "Wie soll Geld verdient werden? (z. B. Abo, Kursgebühr)",
    required: false,
    inputType: "textarea",
  },
  {
    field: "teamSize",
    label: "Teamgröße",
    chapter: 3,
    chapterTitle: "Deine Ressourcen",
    question: "Wie viele Personen arbeiten am Projekt mit?",
    placeholder: "z. B. 2",
    required: false,
    inputType: "number",
  },
  {
    field: "budgetMonthly",
    label: "Budget pro Monat",
    chapter: 3,
    chapterTitle: "Deine Ressourcen",
    question: "Wie viel Budget hast du pro Monat fürs Marketing?",
    required: false,
    inputType: "choice",
    options: BUDGET_OPTIONS,
  },
  {
    field: "timePerWeek",
    label: "Zeit pro Woche fürs Marketing",
    chapter: 3,
    chapterTitle: "Deine Ressourcen",
    question: "Wie viel Zeit kannst du pro Woche fürs Marketing aufbringen?",
    required: false,
    inputType: "choice",
    options: TIME_OPTIONS,
  },
  {
    field: "skills",
    label: "Fähigkeiten & Kanäle",
    chapter: 3,
    chapterTitle: "Deine Ressourcen",
    question: "Was kannst du gut — und welche Kanäle oder Netzwerke hast du schon?",
    placeholder:
      "Was kannst du gut, welche Kanäle oder Netzwerke hast du schon?",
    required: false,
    inputType: "textarea",
  },
  {
    field: "existingInsights",
    label: "Bisherige Kundenerkenntnisse",
    chapter: 3,
    chapterTitle: "Deine Ressourcen",
    question: "Gibt es schon Rückmeldungen von Kunden oder ersten Verkäufen?",
    placeholder: "Rückmeldungen, Gespräche, erste Verkäufe — falls vorhanden",
    required: false,
    inputType: "textarea",
  },
];

/** Last question index in each chapter (0-based). */
export const CHAPTER_END_STEPS = [2, 6, 11] as const;

export function isFirstQuestionInChapter(stepIndex: number): boolean {
  const chapter = PROFILE_QUESTIONS[stepIndex]?.chapter;
  if (!chapter) return false;
  return PROFILE_QUESTIONS.findIndex((question) => question.chapter === chapter) === stepIndex;
}

export function isOnboardingNeeded(project: {
  profileOnboardingComplete?: boolean;
}): boolean {
  return !project.profileOnboardingComplete;
}

export function getResumeStep(project: { profileOnboardingStep?: number }): number {
  const step = project.profileOnboardingStep ?? 0;
  return Math.min(Math.max(step, 0), PROFILE_QUESTIONS.length - 1);
}

export function getChapterProgress(stepIndex: number): {
  chapter: number;
  chapterTitle: string;
  questionNumber: number;
  totalQuestions: number;
} {
  const question = PROFILE_QUESTIONS[stepIndex];
  return {
    chapter: question.chapter,
    chapterTitle: question.chapterTitle,
    questionNumber: stepIndex + 1,
    totalQuestions: PROFILE_QUESTIONS.length,
  };
}

export function projectToFormValues(project: ProfileData): Record<ProfileFieldKey, string> {
  return {
    businessIdea: project.businessIdea ?? "",
    productStatus: project.productStatus ?? "",
    assumedTarget: project.assumedTarget ?? "",
    assumedProblem: project.assumedProblem ?? "",
    valuePropDraft: project.valuePropDraft ?? "",
    revenueIdea: project.revenueIdea ?? "",
    region: project.region ?? "",
    teamSize: project.teamSize != null ? String(project.teamSize) : "",
    budgetMonthly: project.budgetMonthly ?? "",
    timePerWeek: project.timePerWeek ?? "",
    skills: project.skills ?? "",
    existingInsights: project.existingInsights ?? "",
  };
}

export function formValuesToPatchBody(
  id: string,
  values: Record<ProfileFieldKey, string>,
  extras?: {
    profileOnboardingStep?: number;
    profileOnboardingComplete?: boolean;
  }
) {
  return {
    id,
    businessIdea: values.businessIdea.trim() || null,
    productStatus: values.productStatus || null,
    assumedTarget: values.assumedTarget.trim() || null,
    assumedProblem: values.assumedProblem.trim() || null,
    valuePropDraft: values.valuePropDraft.trim() || null,
    revenueIdea: values.revenueIdea.trim() || null,
    region: values.region.trim() || null,
    teamSize: values.teamSize ? Number(values.teamSize) : null,
    budgetMonthly: values.budgetMonthly || null,
    timePerWeek: values.timePerWeek || null,
    skills: values.skills.trim() || null,
    existingInsights: values.existingInsights.trim() || null,
    ...extras,
  };
}

export const PROFILE_FIELD_LABELS: Record<ProfileFieldKey, string> =
  Object.fromEntries(
    PROFILE_QUESTIONS.map((question) => [question.field, question.label])
  ) as Record<ProfileFieldKey, string>;
