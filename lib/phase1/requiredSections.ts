type StatementCategoryLike = {
  category: string;
};

const REQUIRED_CATEGORY_COUNTS = {
  RESOURCE: 2,
  SWOT_STRENGTH: 2,
  SWOT_WEAKNESS: 2,
  SWOT_OPPORTUNITY: 2,
  SWOT_THREAT: 2,
  MARKET_PATH: 2,
} as const;

export type Phase1RequiredCategory = keyof typeof REQUIRED_CATEGORY_COUNTS;

export function getMissingRequiredPhase1Sections(
  statements: StatementCategoryLike[]
): Phase1RequiredCategory[] {
  return (Object.keys(REQUIRED_CATEGORY_COUNTS) as Phase1RequiredCategory[]).filter(
    (category) =>
      statements.filter((statement) => statement.category === category).length <
      REQUIRED_CATEGORY_COUNTS[category]
  );
}

export function hasRequiredPhase1Sections(
  statements: StatementCategoryLike[]
): boolean {
  return getMissingRequiredPhase1Sections(statements).length === 0;
}
