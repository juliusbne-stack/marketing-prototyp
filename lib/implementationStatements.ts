import type { StatementCategory } from "@prisma/client";

// Relevant adopted statements for implementation cockpit context (task
// generation + on-demand elaboration).
export const IMPLEMENTATION_STATEMENT_CATEGORIES: StatementCategory[] = [
  "OPT_TARGET_GROUP",
  "TARGET_SEGMENT",
  "OPT_CUSTOMER_PROBLEM",
  "CUSTOMER_PROBLEM",
  "OPT_VALUE_PROPOSITION",
  "OPT_POSITIONING",
  "OPT_MARKET_ACCESS",
  "MARKET_PATH",
];

export type ImplementationStatement = {
  id: string;
  category: StatementCategory;
  content: string;
  evidenceStatus: string;
  displayNumber: number;
};

export function isImplementationRelevantCategory(
  category: StatementCategory
): boolean {
  return IMPLEMENTATION_STATEMENT_CATEGORIES.includes(category);
}

/** Builds a numbered list of adopted statements for cockpit prompts and UI. */
export function buildImplementationStatements(
  optionStatements: {
    statement: {
      id: string;
      category: StatementCategory;
      content: string;
      evidenceStatus: string;
      adopted: boolean;
    };
  }[],
  adoptedAnalysis: {
    id: string;
    category: StatementCategory;
    content: string;
    evidenceStatus: string;
  }[]
): ImplementationStatement[] {
  const fromOption = optionStatements
    .map((link) => link.statement)
    .filter(
      (statement) =>
        statement.adopted &&
        isImplementationRelevantCategory(statement.category)
    );

  const fromAnalysis = adoptedAnalysis.filter((statement) =>
    isImplementationRelevantCategory(statement.category)
  );

  const merged = [...fromOption, ...fromAnalysis];
  const seen = new Set<string>();
  const unique = merged.filter((statement) => {
    if (seen.has(statement.id)) return false;
    seen.add(statement.id);
    return true;
  });

  return unique.map((statement, index) => ({
    id: statement.id,
    category: statement.category,
    content: statement.content,
    evidenceStatus: statement.evidenceStatus,
    displayNumber: index + 1,
  }));
}

export function implementationStatementsById(
  statements: ImplementationStatement[]
): Map<string, ImplementationStatement> {
  return new Map(statements.map((statement) => [statement.id, statement]));
}
