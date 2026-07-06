import type { Criterion, OptionStatus } from "@prisma/client";

// Client-side shape of an evaluation, matching app/api/ai/3/route.ts.
export type EvaluationData = {
  id: string;
  optionId: string;
  criterion: Criterion;
  score: number;
  rationale: string;
};

// AI prioritization proposal — a suggestion only, the user decides (F7/NF3).
export type RecommendationData = {
  optionId: string;
  rationale: string;
  counterArguments: string;
};

// Slim option shape for the matrix and the prioritization panel.
export type EvaluatedOption = {
  id: string;
  title: string;
  summary: string | null;
  status: OptionStatus;
  prioritizationRationale: string | null;
};

// Row order + German criterion labels (UI_KONZEPT §4, phase 3).
export const CRITERION_ORDER: { criterion: Criterion; label: string }[] = [
  { criterion: "ATTRACTIVENESS", label: "Attraktivität" },
  { criterion: "RESOURCE_FIT", label: "Ressourcenpassung" },
  { criterion: "RISK", label: "Tragbares Risiko" },
  { criterion: "VALIDATION_EFFORT", label: "Prüfaufwand" },
  { criterion: "LEARNING_VALUE", label: "Lernwert" },
  { criterion: "EVIDENCE", label: "Evidenzstärke" },
];
