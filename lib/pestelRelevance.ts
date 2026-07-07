import type { StatementCategory } from "@prisma/client";
import {
  PESTEL_CATEGORIES,
  type PestelCategory,
  type PestelRelevance,
} from "@/lib/schemas/phase1";

const PESTEL_LABELS: Record<PestelCategory, string> = {
  PESTEL_POLITICAL: "Politische",
  PESTEL_ECONOMIC: "Ökonomische",
  PESTEL_SOCIAL: "Soziale",
  PESTEL_TECHNOLOGICAL: "Technologische",
  PESTEL_ECOLOGICAL: "Ökologische",
  PESTEL_LEGAL: "Rechtliche",
};

function isPestelCategory(category: string): category is PestelCategory {
  return (PESTEL_CATEGORIES as readonly string[]).includes(category);
}

function isValidPestelRelevance(value: unknown): value is PestelRelevance[] {
  if (!Array.isArray(value) || value.length !== PESTEL_CATEGORIES.length) {
    return false;
  }

  const categories = new Set<string>();
  for (const entry of value) {
    if (
      !entry ||
      typeof entry !== "object" ||
      !isPestelCategory((entry as PestelRelevance).category) ||
      typeof (entry as PestelRelevance).relevant !== "boolean" ||
      typeof (entry as PestelRelevance).relevanceJustification !== "string" ||
      !(entry as PestelRelevance).relevanceJustification.trim()
    ) {
      return false;
    }
    categories.add((entry as PestelRelevance).category);
  }

  return categories.size === PESTEL_CATEGORIES.length;
}

export function parseStoredPestelRelevance(
  value: unknown
): PestelRelevance[] | null {
  return isValidPestelRelevance(value) ? value : null;
}

/**
 * Fallback for projects created before pestelRelevance was stored:
 * derive display data from existing PESTEL statements.
 */
export function resolvePestelRelevance(
  stored: unknown,
  statements: { category: StatementCategory }[]
): PestelRelevance[] {
  const parsed = parseStoredPestelRelevance(stored);
  if (parsed) {
    return PESTEL_CATEGORIES.map(
      (category) =>
        parsed.find((entry) => entry.category === category) ?? {
          category,
          relevant: false,
          relevanceJustification:
            "Keine gespeicherte Relevanzbewertung für diese Dimension.",
        }
    );
  }

  const statementCategories = new Set(
    statements
      .map((statement) => statement.category)
      .filter(isPestelCategory)
  );

  return PESTEL_CATEGORIES.map((category) => {
    const hasStatements = statementCategories.has(category);
    const label = PESTEL_LABELS[category];

    return {
      category,
      relevant: hasStatements,
      relevanceJustification: hasStatements
        ? `${label} Faktoren sind in der bestehenden Analyse berücksichtigt — eine separate KI-Relevanzbewertung liegt noch nicht vor.`
        : `${label} Faktoren wurden in einer früheren Analyse nicht separat bewertet und sind aktuell ohne KI-Aussage.`,
    };
  });
}
