import type { OptionStatus, StatementCategory } from "@prisma/client";
import type { StatementData } from "@/components/statements/types";

// Client-side shape of a strategy option, matching the mapping in
// app/api/ai/2/route.ts and app/api/options/route.ts.
export type OptionData = {
  id: string;
  title: string;
  summary: string | null;
  status: OptionStatus;
  prioritizationRationale: string | null;
  statements: StatementData[];
};

// Dimension the AI marked as not affected by the phase 5 learning results
// (revision mode). Held in client state only — not persisted.
export type UnchangedDimension = {
  dimensionCategory: StatementCategory;
  reason: string;
};

// Display order + German labels of the six option dimensions (UI_KONZEPT §4).
export const DIMENSION_ORDER: { category: StatementCategory; label: string }[] =
  [
    { category: "OPT_TARGET_GROUP", label: "Zielgruppe" },
    { category: "OPT_CUSTOMER_PROBLEM", label: "Kundenproblem" },
    { category: "OPT_VALUE_PROPOSITION", label: "Nutzenversprechen" },
    { category: "OPT_POSITIONING", label: "Positionierung" },
    { category: "OPT_MARKET_ACCESS", label: "Marktzugang" },
    { category: "OPT_REVENUE_GROWTH", label: "Erlös-/Wachstumslogik" },
  ];
