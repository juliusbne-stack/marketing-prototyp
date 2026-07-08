import type { StatementCategory, StrategyDimension } from "@prisma/client";

const CATEGORY_TO_DIMENSION: Partial<
  Record<StatementCategory, StrategyDimension>
> = {
  OPT_TARGET_GROUP: "TARGET_GROUP",
  OPT_CUSTOMER_PROBLEM: "CUSTOMER_PROBLEM",
  OPT_VALUE_PROPOSITION: "VALUE_PROPOSITION",
  OPT_POSITIONING: "POSITIONING",
  OPT_MARKET_ACCESS: "MARKET_ACCESS",
  OPT_REVENUE_GROWTH: "REVENUE_GROWTH",
  TARGET_SEGMENT: "TARGET_GROUP",
  CUSTOMER_PROBLEM: "CUSTOMER_PROBLEM",
};

export function statementCategoryToStrategyDimension(
  category: StatementCategory
): StrategyDimension | null {
  return CATEGORY_TO_DIMENSION[category] ?? null;
}
