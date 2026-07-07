import { z } from "zod";

/**
 * Evidence status for option dimensions (phase 2+). The model must use
 * ASSUMPTION or OPEN_QUESTION, but sometimes returns FACT from the global
 * prompt — normalize to ASSUMPTION per phase-2 rules.
 */
export const optionDimensionEvidenceStatus = z
  .enum(["FACT", "ASSUMPTION", "OPEN_QUESTION"])
  .transform((status) =>
    status === "FACT" ? ("ASSUMPTION" as const) : status
  );

/** Option dimensions are always AI_DERIVATION; coerce missing or wrong values. */
export const optionDimensionOrigin = z
  .unknown()
  .transform(() => "AI_DERIVATION" as const);
