/** Bounds for randomly simulated competitor/alternative actor count in Phase 1. */
export const MIN_COMPETITOR_COUNT = 6;
export const MAX_COMPETITOR_COUNT = 9;

/** Picks a random target actor count for one Phase-1 analysis run (inclusive range). */
export function pickRandomTargetCompetitorCount(): number {
  return (
    Math.floor(
      Math.random() * (MAX_COMPETITOR_COUNT - MIN_COMPETITOR_COUNT + 1)
    ) + MIN_COMPETITOR_COUNT
  );
}

type CompetitorStatementRef = {
  category: string;
  competitorLabel?: string | null;
};

/** Counts distinct adopted COMPETITOR profile labels. */
export function countAdoptedCompetitorLabels(
  statements: CompetitorStatementRef[]
): number {
  const labels = new Set<string>();
  for (const statement of statements) {
    if (
      statement.category === "COMPETITOR" &&
      statement.competitorLabel?.trim()
    ) {
      labels.add(statement.competitorLabel.trim());
    }
  }
  return labels.size;
}

/** New complete profiles needed to reach the per-run target without touching adopted actors. */
export function requiredNewCompetitorProfiles(
  targetCompetitorCount: number,
  adoptedCompetitorLabelCount: number
): number {
  return Math.max(0, targetCompetitorCount - adoptedCompetitorLabelCount);
}
