import type { TestSubjectValue } from "@/lib/schemas/metric";
import type { ValidationCore } from "./validationCoreTypes";
import { claimTypeToTestSubject } from "./validationCoreTypes";

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

const REACH_POSITIVE =
  /\b(erreichbar|erreichen|reichweite|kanal|marktzugang|zugang\s+zur\s+zielgruppe)\b/i;
const REACH_VIA_CHANNEL =
  /\büber\s+[\wäöüß.-]+\s+(ansprechen|finden|erreichen|anwerben)\b/i;

const USAGE_SIGNAL =
  /\b(nutzung|nutzen|nutzungsbereitschaft|bereitwilligkeit\s+zur\s+nutzung|interesse|wollen|einlassen|akzeptanz)\b/i;

const PAYMENT_SIGNAL =
  /\b(zahlungsbereitschaft|zahlungsbereit|zahlen|abo|abonnement|preis|€|euro)\b/i;

const NEED_SIGNAL =
  /\b(bedarf|bedürfnis|sucht nach|benötigt|braucht|interesse an|nachfrage nach)\b/i;

const PROBLEM_SIGNAL =
  /\b(problem|schmerz|problemrelevanz|mühe|schwierigkeit|unzureichend gelöst|unstrukturiert)\b/i;

const DIFFERENTIATION_SIGNAL =
  /\b(abgrenzung|alternative|besser\s+als|differenzierung|vergleich|präferenz|gegenüber)\b/i;

const REVENUE_SIGNAL = /\b(erlös|umsatz|monetarisierung|abonnementmodell|pricing)\b/i;

const VALUE_SIGNAL =
  /\b(nutzen|hilfreich|wahrgenommen|verständnis|nutzenversprechen|wert)\b/i;

function hasNegatedReach(text: string): boolean {
  return /\b(nicht|keine|ohne)\s+[\wäöüß]*\s*(erreichbar|reichweite|kanal)\b/i.test(
    text
  );
}

function hasPositiveReachability(
  uncertainty: string,
  justification: string,
  content: string
): boolean {
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
 * Primary testSubject from ValidationCore + text layers.
 * strategyDimension is NOT used for classification.
 */
export function derivePrimaryTestSubject(
  input: AssumptionTextInput,
  core?: ValidationCore
): TestSubjectValue {
  if (core) {
    return claimTypeToTestSubject(core.claimType);
  }

  const allowed = deriveAllowedDecisiveTestSubjects(input);
  if (allowed.includes("WILLINGNESS_TO_PAY")) return "WILLINGNESS_TO_PAY";
  if (allowed.includes("REACHABILITY")) return "REACHABILITY";
  if (allowed.includes("PROBLEM_RELEVANCE")) return "PROBLEM_RELEVANCE";
  if (allowed.includes("VALUE_UNDERSTANDING")) return "VALUE_UNDERSTANDING";
  if (allowed.includes("DIFFERENTIATION")) return "DIFFERENTIATION";
  if (allowed.includes("REVENUE_MECHANICS")) return "REVENUE_MECHANICS";
  return allowed[0] ?? "OTHER";
}

/**
 * Derives the allowed DECISIVE testSubject set from assumption text + ValidationCore.
 * Weighting: uncertainty > justification > content; ValidationCore provides primary anchor.
 */
export function deriveAllowedDecisiveTestSubjects(
  input: AssumptionTextInput,
  core?: ValidationCore
): TestSubjectValue[] {
  const uncertainty = input.uncertainty?.trim() ?? "";
  const justification = input.justification?.trim() ?? "";
  const content = input.content.trim();
  const allowed = new Set<TestSubjectValue>();

  if (core) {
    allowed.add(claimTypeToTestSubject(core.claimType));
    if (core.claimType === "NEED") allowed.add("PROBLEM_RELEVANCE");
    if (core.claimType === "PROBLEM_RELEVANCE") allowed.add("PROBLEM_RELEVANCE");
    if (core.claimType === "CHANNEL_FIT") allowed.add("REACHABILITY");
    if (core.claimType === "VALUE_PERCEPTION") {
      allowed.add("VALUE_UNDERSTANDING");
      allowed.add("DIFFERENTIATION");
    }
  }

  if (layerMatches(USAGE_SIGNAL, uncertainty, justification, content)) {
    allowed.add("VALUE_UNDERSTANDING");
    allowed.add("OTHER");
  }

  if (layerMatches(PAYMENT_SIGNAL, uncertainty, justification, content)) {
    allowed.add("WILLINGNESS_TO_PAY");
    allowed.add("REVENUE_MECHANICS");
  }

  if (layerMatches(REVENUE_SIGNAL, uncertainty, justification, content)) {
    allowed.add("REVENUE_MECHANICS");
  }

  if (
    layerMatches(NEED_SIGNAL, uncertainty, justification, content) ||
    (layerMatches(PROBLEM_SIGNAL, justification, content) ||
      (layerMatches(PROBLEM_SIGNAL, uncertainty) &&
        !USAGE_SIGNAL.test(uncertainty)))
  ) {
    allowed.add("PROBLEM_RELEVANCE");
  }

  if (layerMatches(VALUE_SIGNAL, uncertainty, justification, content)) {
    allowed.add("VALUE_UNDERSTANDING");
  }

  if (layerMatches(DIFFERENTIATION_SIGNAL, uncertainty, justification, content)) {
    allowed.add("DIFFERENTIATION");
  }

  if (hasPositiveReachability(uncertainty, justification, content)) {
    allowed.add("REACHABILITY");
  }

  if (allowed.size === 0) {
    for (const subject of PERMISSIVE_DEFAULT) {
      allowed.add(subject);
    }
  }

  return serializeAllowedTestSubjects(allowed);
}

/** @deprecated Use deriveAllowedDecisiveTestSubjects — kept for Set-based callers. */
export function deriveAllowedDecisiveTestSubjectsSet(
  input: AssumptionTextInput,
  core?: ValidationCore
): Set<TestSubjectValue> {
  return new Set(deriveAllowedDecisiveTestSubjects(input, core));
}

/** Serialize for LLM context / repair payloads. */
export function serializeAllowedTestSubjects(
  subjects: Iterable<TestSubjectValue>
): TestSubjectValue[] {
  return [...subjects];
}
