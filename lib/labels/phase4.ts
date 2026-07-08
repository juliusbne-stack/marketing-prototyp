import type {
  SignalCategory,
  StepType,
  StrategyDimension,
  TestSubject,
} from "@prisma/client";

export const STEP_TYPE_LABEL: Record<StepType, string> = {
  VALIDATION: "Validierung",
  SCALING: "Skalierung",
};

export const STRATEGY_DIMENSION_LABEL: Record<StrategyDimension, string> = {
  TARGET_GROUP: "Zielgruppe",
  CUSTOMER_PROBLEM: "Kundenproblem",
  VALUE_PROPOSITION: "Nutzenversprechen",
  POSITIONING: "Positionierung",
  MARKET_ACCESS: "Marktzugang",
  REVENUE_GROWTH: "Erlös und Wachstum",
};

export const TEST_SUBJECT_LABEL: Record<TestSubject, string> = {
  WILLINGNESS_TO_PAY: "Zahlungsbereitschaft",
  REACHABILITY: "Erreichbarkeit",
  PROBLEM_RELEVANCE: "Problemrelevanz",
  VALUE_UNDERSTANDING: "Nutzenverständnis",
  DIFFERENTIATION: "Differenzierung",
  REVENUE_MECHANICS: "Erlösmechanik",
  OTHER: "Sonstiges",
};

export const SIGNAL_CATEGORY_LABEL: Record<SignalCategory, string> = {
  COMMITMENT: "Commitment",
  BEHAVIOR: "Verhalten",
  ATTENTION: "Aufmerksamkeit",
  QUALITATIVE: "Qualitativ",
};

export const VALIDATION_QUESTION_HEADING = "Was muss geprüft werden?";
export const VALIDATION_DESIGN_HEADING = "Testdesign";
export const VALIDATION_SIGNALS_HEADING = "Entscheidende Signale";
export const VALIDATION_SUCCESS_LABEL = "Stützend wenn";
export const VALIDATION_FAILURE_LABEL = "Widerlegend wenn";

export const SCALING_QUESTION_HEADING = "Was wird skaliert?";
export const SCALING_DESIGN_HEADING = "Skalierungsdesign";
export const SCALING_SIGNALS_HEADING = "Erfolgskriterien der Skalierung";
export const SCALING_SUCCESS_LABEL = "Skalierung trägt wenn";
export const SCALING_FAILURE_LABEL = "Skalierungsgrenze erreicht wenn";

export const MARKETING_ACTIVITIES_HEADING =
  "Marketingaktivitäten zur Durchführung";

export const EMPTY_WHITELIST_VALIDATION =
  "Es liegen aktuell keine übernommenen Annahmen oder offenen Fragen vor, die geprüft werden könnten. Erweitere die Strategieoption oder kehre zur Situationsanalyse zurück.";

export const EMPTY_WHITELIST_SCALING =
  "Es liegen keine im vorherigen Durchlauf gestützten Fakten vor, die skaliert werden könnten.";

export const SCALING_MODE_BANNER =
  "Fortführungsmodus: Diese Schritte skalieren bereits gestützte Fakten. Es werden bewusst keine neuen strategischen Fragen geöffnet. Für neue Tests wähle in Phase 5 „Anpassen“.";

export const METHOD_WARNING_ADOPT_CONFIRM =
  "Dieser Schritt enthält einen Methodenhinweis. Trotzdem übernehmen?";

export function stepCopy(stepType: StepType) {
  return stepType === "SCALING"
    ? {
        questionHeading: SCALING_QUESTION_HEADING,
        designHeading: SCALING_DESIGN_HEADING,
        signalsHeading: SCALING_SIGNALS_HEADING,
        successLabel: SCALING_SUCCESS_LABEL,
        failureLabel: SCALING_FAILURE_LABEL,
      }
    : {
        questionHeading: VALIDATION_QUESTION_HEADING,
        designHeading: VALIDATION_DESIGN_HEADING,
        signalsHeading: VALIDATION_SIGNALS_HEADING,
        successLabel: VALIDATION_SUCCESS_LABEL,
        failureLabel: VALIDATION_FAILURE_LABEL,
      };
}
