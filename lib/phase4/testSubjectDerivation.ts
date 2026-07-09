import type { TestSubjectValue } from "@/lib/schemas/metric";

export type AssumptionTextInput = {
  content: string;
  justification: string | null;
  uncertainty: string | null;
};

/** Permissive fallback when no category matches — never includes REACHABILITY. */
const PERMISSIVE_DEFAULT: readonly TestSubjectValue[] = [
  "VALUE_UNDERSTANDING",
  "PROBLEM_RELEVANCE",
  "OTHER",
];

// --- Reachability: positive signals only (REACHABILITY-VETO) ---
// Explicit reach/channel language — NOT bare "Plattform/digital/online/App/Tool".
const REACH_POSITIVE =
  /\b(erreichbar|erreichen|reichweite|kanal|marktzugang|zugang\s+zur\s+zielgruppe)\b/i;
const REACH_VIA_CHANNEL =
  /\büber\s+[\wäöüß.-]+\s+(ansprechen|finden|erreichen|anwerben)\b/i;

// --- Usage / interest / willingness to use (≠ reach) ---
const USAGE_SIGNAL =
  /\b(nutzung|nutzen|nutzungsbereitschaft|bereitwilligkeit\s+zur\s+nutzung|interesse|wollen|einlassen|akzeptanz)\b/i;

// --- Payment ---
const PAYMENT_SIGNAL =
  /\b(zahlungsbereitschaft|zahlungsbereit|zahlen|abo|abonnement|preis|€|euro)\b/i;

// --- Problem relevance (without usage in uncertainty) ---
const PROBLEM_SIGNAL =
  /\b(problem|schmerz|bedarf|problemrelevanz|mühe|schwierigkeit)\b/i;

// --- Differentiation ---
const DIFFERENTIATION_SIGNAL =
  /\b(abgrenzung|alternative|besser\s+als|differenzierung|vergleich|präferenz)\b/i;

// --- Revenue mechanics (subscription models etc.) ---
const REVENUE_SIGNAL = /\b(erlös|umsatz|monetarisierung|abonnementmodell|pricing)\b/i;

function hasNegatedReach(text: string): boolean {
  return /\b(nicht|keine|ohne)\s+[\wäöüß]*\s*(erreichbar|reichweite|kanal)\b/i.test(
    text
  );
}

/**
 * REACHABILITY-VETO: true only when reach/channel language is present.
 * "digitale Plattformen" in a usage context does NOT qualify.
 */
function hasPositiveReachability(
  uncertainty: string,
  justification: string,
  content: string
): boolean {
  // REACHABILITY-VETO: uncertainty frames usage/interest without reach verbs.
  if (uncertainty && USAGE_SIGNAL.test(uncertainty)) {
    const uncertaintyHasReach =
      REACH_POSITIVE.test(uncertainty) || REACH_VIA_CHANNEL.test(uncertainty);
    if (!uncertaintyHasReach) {
      return false;
    }
  }

  for (const text of [uncertainty, justification, content]) {
    if (!text || hasNegatedReach(text)) continue;
    if (REACH_POSITIVE.test(text) || REACH_VIA_CHANNEL.test(text)) {
      return true;
    }
  }

  return false;
}

function layerMatches(signal: RegExp, ...texts: string[]): boolean {
  return texts.some((text) => text && signal.test(text));
}

/**
 * Derives the allowed DECISIVE testSubject set from assumption text.
 * Weighting: uncertainty > justification > content (uncertainty checked first for veto).
 * Does NOT use strategyDimension. Never returns an empty set.
 */
export function deriveAllowedDecisiveTestSubjects(
  input: AssumptionTextInput
): Set<TestSubjectValue> {
  const uncertainty = input.uncertainty?.trim() ?? "";
  const justification = input.justification?.trim() ?? "";
  const content = input.content.trim();
  const allowed = new Set<TestSubjectValue>();

  // Rule: usage/interest → VALUE_UNDERSTANDING (+ OTHER for ambiguity).
  if (layerMatches(USAGE_SIGNAL, uncertainty, justification, content)) {
    allowed.add("VALUE_UNDERSTANDING");
    allowed.add("OTHER");
  }

  // Rule: payment → WILLINGNESS_TO_PAY + REVENUE_MECHANICS.
  if (layerMatches(PAYMENT_SIGNAL, uncertainty, justification, content)) {
    allowed.add("WILLINGNESS_TO_PAY");
    allowed.add("REVENUE_MECHANICS");
  }

  // Rule: revenue mechanics phrasing without explicit €.
  if (layerMatches(REVENUE_SIGNAL, uncertainty, justification, content)) {
    allowed.add("REVENUE_MECHANICS");
  }

  // Rule: problem relevance — skip if uncertainty is purely about usage (usage wins).
  if (
    layerMatches(PROBLEM_SIGNAL, justification, content) ||
    (layerMatches(PROBLEM_SIGNAL, uncertainty) &&
      !USAGE_SIGNAL.test(uncertainty))
  ) {
    allowed.add("PROBLEM_RELEVANCE");
  }

  // Rule: differentiation.
  if (layerMatches(DIFFERENTIATION_SIGNAL, uncertainty, justification, content)) {
    allowed.add("DIFFERENTIATION");
  }

  // Rule: REACHABILITY only with positive reach language (veto otherwise).
  if (hasPositiveReachability(uncertainty, justification, content)) {
    allowed.add("REACHABILITY");
  }

  // Rule: ambiguous / no match → permissive default without REACHABILITY.
  if (allowed.size === 0) {
    for (const subject of PERMISSIVE_DEFAULT) {
      allowed.add(subject);
    }
  }

  return allowed;
}

/** Serialize for LLM context / repair payloads. */
export function serializeAllowedTestSubjects(
  subjects: Iterable<TestSubjectValue>
): TestSubjectValue[] {
  return [...subjects];
}
