import type {
  AdaptationType,
  EvidenceStatus,
  FeedbackResult,
} from "@prisma/client";

// Client-side shape of a market feedback, matching app/api/feedback/route.ts
// and app/api/ai/5/route.ts.
export type FeedbackData = {
  id: string;
  projectId: string;
  stepId: string | null;
  statementId: string;
  content: string;
  result: FeedbackResult;
  // null = not yet assessed by the AI (the stored result is a placeholder).
  interpretation: string | null;
  proposedNewStatus: EvidenceStatus | null;
  statusApplied: boolean;
};

// AI adaptation proposal — a suggestion only, the user decides (F9/NF3).
export type AdaptationProposal = {
  decision: AdaptationType;
  loopBackToPhase: number | null;
  rationale: string;
};

// User-confirmed decision, matching app/api/adaptation/route.ts.
export type AdaptationData = AdaptationProposal & {
  id: string;
  optionId: string;
  userConfirmed: boolean;
};

export const ADAPTATION_LABELS: Record<AdaptationType, string> = {
  CONTINUE: "Fortführen",
  ADAPT: "Anpassen",
  DEFER: "Zurückstellen",
  DISCARD: "Verwerfen",
  LOOP_BACK: "Zurück zu Phase X",
};

export const ADAPTATION_ORDER: AdaptationType[] = [
  "CONTINUE",
  "ADAPT",
  "DEFER",
  "DISCARD",
  "LOOP_BACK",
];

// Result chip config (UI_KONZEPT: danger colors are reserved for phase 5).
export const RESULT_CONFIG: Record<
  FeedbackResult,
  { label: string; className: string }
> = {
  SUPPORTED: {
    label: "Gestützt",
    className: "bg-evidence-fact-bg text-evidence-fact-text",
  },
  PARTIALLY_SUPPORTED: {
    label: "Teilweise gestützt",
    className: "bg-evidence-assumption-bg text-evidence-assumption-text",
  },
  REFUTED: {
    label: "Widerlegt",
    className: "bg-danger-bg text-danger-text",
  },
  AMBIGUOUS: {
    label: "Mehrdeutig",
    className: "bg-evidence-question-bg text-evidence-question-text",
  },
};
