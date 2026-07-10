import { MIN_COMPETITOR_COUNT, MAX_COMPETITOR_COUNT } from "@/lib/competitorCount";
import type { Phase1AnalysisAnchor } from "./types";

/** Distributes targetCompetitorCount evenly across batches 1–3. */
export function distributeCompetitorsToBatches(
  targetCount: number
): [number, number, number] {
  const clamped = Math.min(
    MAX_COMPETITOR_COUNT,
    Math.max(MIN_COMPETITOR_COUNT, targetCount)
  );
  const base = Math.floor(clamped / 3);
  const remainder = clamped % 3;
  return [
    base + (remainder > 0 ? 1 : 0),
    base + (remainder > 1 ? 1 : 0),
    base,
  ];
}

export function assignBatchesToCompetitorPlan(
  anchor: Phase1AnalysisAnchor,
  targetCount: number
): Phase1AnalysisAnchor {
  const [b1, b2] = distributeCompetitorsToBatches(targetCount);
  const batchSizes = { 1: b1, 2: b2, 3: targetCount - b1 - b2 };
  let batchIndex: 1 | 2 | 3 = 1;
  let countInBatch = 0;

  const competitorPlan = anchor.competitorPlan.map((candidate, index) => {
    if (countInBatch >= batchSizes[batchIndex]) {
      batchIndex = (batchIndex === 1 ? 2 : 3) as 1 | 2 | 3;
      countInBatch = 0;
    }
    countInBatch += 1;
    return {
      ...candidate,
      candidateId: candidate.candidateId || `comp-${index + 1}`,
      batch: batchIndex,
    };
  });

  return { ...anchor, competitorPlan };
}

export function getBatchCandidates(
  anchor: Phase1AnalysisAnchor,
  batch: 1 | 2 | 3
) {
  return anchor.competitorPlan.filter((c) => c.batch === batch);
}
