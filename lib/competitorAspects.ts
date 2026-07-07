// Competitor profile dimensions for COMPETITOR statements (Phase 1).
export const COMPETITOR_ASPECTS = [
  "ENTITY_TYPE",
  "OFFERING",
  "TARGET_CUSTOMERS",
  "PRICING",
  "SCALE",
  "RELEVANCE",
] as const;

export type CompetitorAspect = (typeof COMPETITOR_ASPECTS)[number];

export const COMPETITOR_ASPECT_LABELS: Record<CompetitorAspect, string> = {
  ENTITY_TYPE: "Art",
  OFFERING: "Angebot",
  TARGET_CUSTOMERS: "Zielkunden",
  PRICING: "Preis",
  SCALE: "Größe & Reichweite",
  RELEVANCE: "Relevanz",
};

export function isCompetitorAspect(value: string): value is CompetitorAspect {
  return (COMPETITOR_ASPECTS as readonly string[]).includes(value);
}
