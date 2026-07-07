type StatementLike = {
  category: string;
  content: string;
  segmentLabel?: string | null;
  segmentAspect?: string | null;
  competitorLabel?: string | null;
  competitorAspect?: string | null;
};

const STOP_WORDS = new Set([
  "das",
  "dem",
  "den",
  "der",
  "des",
  "die",
  "ein",
  "eine",
  "einem",
  "einen",
  "einer",
  "eines",
  "und",
  "mit",
  "für",
  "von",
  "aus",
  "auf",
  "ist",
  "sind",
  "hat",
  "haben",
  "wird",
  "werden",
  "nicht",
  "auch",
  "als",
  "bei",
  "zum",
  "zur",
  "uber",
  "ueber",
  "vom",
  "beim",
  "über",
  "dass",
  "eine",
  "einen",
  "einer",
  "sich",
  "was",
  "wie",
  "oder",
  "nur",
  "noch",
  "sehr",
  "bereits",
  "durch",
  "nach",
  "vor",
  "zwischen",
  "startup",
  "start",
  "up",
]);

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(" ")
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function tokenSet(text: string): Set<string> {
  return new Set(tokenize(text));
}

function significantTokenSet(text: string): Set<string> {
  return new Set(tokenize(text).filter((token) => token.length >= 4));
}

function tokensMatch(a: string, b: string): boolean {
  if (a === b) return true;
  const minLen = Math.min(a.length, b.length);
  if (minLen >= 5) {
    const prefixLen = Math.min(6, minLen);
    return a.slice(0, prefixLen) === b.slice(0, prefixLen);
  }
  return false;
}

function fuzzyTokenOverlap(setA: Set<string>, setB: Set<string>): number {
  let intersection = 0;
  for (const tokenA of setA) {
    for (const tokenB of setB) {
      if (tokensMatch(tokenA, tokenB)) {
        intersection++;
        break;
      }
    }
  }
  return intersection;
}

/** Jaccard similarity on normalized token sets (0..1), with fuzzy token matching. */
export function jaccardSimilarity(a: string, b: string): number {
  const setA = tokenSet(a);
  const setB = tokenSet(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  const intersection = fuzzyTokenOverlap(setA, setB);
  const union = new Set([...setA, ...setB]).size;
  return intersection / union;
}

function sameSegmentKey(a: StatementLike, b: StatementLike): boolean {
  if (a.category === "TARGET_SEGMENT" && b.category === "TARGET_SEGMENT") {
    return (
      normalizeText(a.segmentLabel ?? "") === normalizeText(b.segmentLabel ?? "") &&
      a.segmentAspect === b.segmentAspect
    );
  }

  if (a.category === "COMPETITOR" && b.category === "COMPETITOR") {
    const aHasProfile = !!(a.competitorLabel?.trim() || a.competitorAspect);
    const bHasProfile = !!(b.competitorLabel?.trim() || b.competitorAspect);
    if (!aHasProfile && !bHasProfile) {
      return true;
    }
    if (aHasProfile && bHasProfile) {
      return (
        normalizeText(a.competitorLabel ?? "") ===
          normalizeText(b.competitorLabel ?? "") &&
        a.competitorAspect === b.competitorAspect
      );
    }
    return false;
  }

  return a.category === b.category;
}

const DEFAULT_THRESHOLD = 0.55;

/**
 * Returns true when two statements express the same claim within their
 * comparison scope. SWOT may overlap thematically with RESOURCE etc. —
 * only same category (and segment key for TARGET_SEGMENT) is compared.
 */
export function isSimilarStatement(
  candidate: StatementLike,
  existing: StatementLike,
  threshold = DEFAULT_THRESHOLD
): boolean {
  if (!sameSegmentKey(candidate, existing)) return false;

  const sigCandidate = significantTokenSet(candidate.content);
  const sigExisting = significantTokenSet(existing.content);
  const significantOverlap = fuzzyTokenOverlap(sigCandidate, sigExisting);
  const minSignificant = Math.min(sigCandidate.size, sigExisting.size);
  const significantRatio =
    minSignificant > 0 ? significantOverlap / minSignificant : 0;

  if (significantOverlap >= 3) {
    return true;
  }

  if (significantOverlap >= 2 && minSignificant > 0 && significantRatio >= 0.35) {
    return true;
  }

  const similarity = jaccardSimilarity(candidate.content, existing.content);
  if (similarity >= threshold) return true;

  const candidateTokens = tokenSet(candidate.content);
  const existingTokens = tokenSet(existing.content);
  if (candidateTokens.size === 0 || existingTokens.size === 0) return false;

  const overlap = fuzzyTokenOverlap(candidateTokens, existingTokens);
  const smallerSize = Math.min(candidateTokens.size, existingTokens.size);

  // High subset overlap catches paraphrases with extra filler words.
  return overlap / smallerSize >= 0.65;
}

export function filterDuplicateStatements<T extends StatementLike>(
  candidates: T[],
  existing: StatementLike[],
  threshold = DEFAULT_THRESHOLD
): { kept: T[]; filtered: T[] } {
  const kept: T[] = [];
  const filtered: T[] = [];
  const baseline = [...existing];

  for (const candidate of candidates) {
    const duplicate = baseline.some((item) =>
      isSimilarStatement(candidate, item, threshold)
    );
    if (duplicate) {
      filtered.push(candidate);
    } else {
      kept.push(candidate);
      baseline.push(candidate);
    }
  }

  return { kept, filtered };
}
