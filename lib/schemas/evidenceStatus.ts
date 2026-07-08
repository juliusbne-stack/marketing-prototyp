import { z } from "zod";

export const EVIDENCE_STATUS_VALUES = [
  "FACT",
  "ASSUMPTION",
  "OPEN_QUESTION",
] as const;

export type EvidenceStatusValue = (typeof EVIDENCE_STATUS_VALUES)[number];

const ORIGIN_VALUES = [
  "USER_INPUT",
  "SIMULATED_RESEARCH",
  "AI_DERIVATION",
] as const;

export type OriginValue = (typeof ORIGIN_VALUES)[number];

function normalizeEnumKey(value: string): string {
  return value.trim().toUpperCase().replace(/[\s-]+/g, "_");
}

/**
 * Coerces common LLM variants (casing, spacing, German labels, origin mix-ups)
 * before Zod enum validation — reduces 502s on Phase-1 runs.
 */
export function normalizeEvidenceStatus(value: unknown): EvidenceStatusValue {
  if (typeof value !== "string" || !value.trim()) {
    return "ASSUMPTION";
  }

  const key = normalizeEnumKey(value);
  if ((EVIDENCE_STATUS_VALUES as readonly string[]).includes(key)) {
    return key as EvidenceStatusValue;
  }

  const aliases: Record<string, EvidenceStatusValue> = {
    FAKT: "FACT",
    ANNAHME: "ASSUMPTION",
    ASSUMED: "ASSUMPTION",
    HYPOTHESIS: "ASSUMPTION",
    OFFENE_FRAGE: "OPEN_QUESTION",
    OPEN: "OPEN_QUESTION",
    QUESTION: "OPEN_QUESTION",
    UNKNOWN: "OPEN_QUESTION",
    // LLM sometimes puts origin values into evidenceStatus
    AI_DERIVATION: "ASSUMPTION",
    SIMULATED_RESEARCH: "ASSUMPTION",
    USER_INPUT: "FACT",
  };

  return aliases[key] ?? "ASSUMPTION";
}

export function normalizeOrigin(value: unknown): OriginValue {
  if (typeof value !== "string" || !value.trim()) {
    return "AI_DERIVATION";
  }

  const key = normalizeEnumKey(value);
  if ((ORIGIN_VALUES as readonly string[]).includes(key)) {
    return key as OriginValue;
  }

  const aliases: Record<string, OriginValue> = {
    USER: "USER_INPUT",
    NUTZER: "USER_INPUT",
    NUTZEREINGABE: "USER_INPUT",
    RESEARCH: "SIMULATED_RESEARCH",
    SIMULATION: "SIMULATED_RESEARCH",
    SIMULIERTE_RECHERCHE: "SIMULATED_RESEARCH",
    DERIVATION: "AI_DERIVATION",
    KI: "AI_DERIVATION",
    AI: "AI_DERIVATION",
    // evidenceStatus values accidentally in origin
    FACT: "USER_INPUT",
    ASSUMPTION: "AI_DERIVATION",
    OPEN_QUESTION: "AI_DERIVATION",
  };

  return aliases[key] ?? "AI_DERIVATION";
}

/** Phase-1 statement evidenceStatus with LLM-tolerant preprocessing. */
export const phase1EvidenceStatus = z.preprocess(
  normalizeEvidenceStatus,
  z.enum(EVIDENCE_STATUS_VALUES)
);

/** Phase-1 statement origin with LLM-tolerant preprocessing. */
export const phase1Origin = z.preprocess(normalizeOrigin, z.enum(ORIGIN_VALUES));

/**
 * Evidence status for option dimensions (phase 2+). The model must use
 * ASSUMPTION or OPEN_QUESTION, but sometimes returns FACT from the global
 * prompt — normalize to ASSUMPTION per phase-2 rules.
 */
export const optionDimensionEvidenceStatus = z
  .enum(EVIDENCE_STATUS_VALUES)
  .transform((status) =>
    status === "FACT" ? ("ASSUMPTION" as const) : status
  );

/** Option dimensions are always AI_DERIVATION; coerce missing or wrong values. */
export const optionDimensionOrigin = z
  .unknown()
  .transform(() => "AI_DERIVATION" as const);
