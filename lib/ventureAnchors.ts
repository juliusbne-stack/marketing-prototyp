/**
 * Explicit venture anchors for PESTEL discrimination — derived from profile fields
 * (no extra DB columns). Used in Phase-1 LLM context.
 */

type ProjectProfile = {
  businessIdea: string | null;
  assumedTarget: string | null;
  revenueIdea: string | null;
  region: string | null;
  valuePropDraft: string | null;
  assumedProblem: string | null;
};

export type VentureAnchors = {
  zielsegment: string | null;
  preissegment: string | null;
  produktkategorie: string | null;
  regionMarkt: string | null;
  /** Anker, die im Profil noch fehlen — PESTEL soll dort OPEN_QUESTION statt Fakten erfinden. */
  fehlendeAnker: string[];
};

const adoptedPestelRelevantCategories = new Set([
  "PESTEL_POLITICAL",
  "PESTEL_ECONOMIC",
  "PESTEL_SOCIAL",
  "PESTEL_TECHNOLOGICAL",
  "PESTEL_ECOLOGICAL",
  "PESTEL_LEGAL",
  "TARGET_SEGMENT",
  "CUSTOMER_PROBLEM",
  "MARKET_PATH",
]);

export function buildVentureAnchors(project: ProjectProfile): VentureAnchors {
  const zielsegment = project.assumedTarget?.trim() || null;
  const preissegment = project.revenueIdea?.trim() || null;
  const produktkategorie = project.businessIdea?.trim() || null;
  const regionMarkt = project.region?.trim() || null;

  const fehlendeAnker: string[] = [];
  if (!zielsegment) fehlendeAnker.push("Zielsegment");
  if (!preissegment) fehlendeAnker.push("Preissegment");
  if (!produktkategorie) fehlendeAnker.push("Produktkategorie");
  if (!regionMarkt) fehlendeAnker.push("Region/Markt");

  return {
    zielsegment,
    preissegment,
    produktkategorie,
    regionMarkt,
    fehlendeAnker,
  };
}

/** Adopted statements that can anchor PESTEL (segments, price, market). */
export function filterAdoptedAnchorsForPestel<
  T extends { category: string; adopted?: boolean },
>(statements: T[]): T[] {
  return statements.filter(
    (statement) =>
      statement.adopted !== false &&
      adoptedPestelRelevantCategories.has(statement.category)
  );
}
