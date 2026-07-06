import { z } from "zod";

// Zod schema mirroring the phase 1 JSON output format from docs/PROMPTS.md.
// Categories are restricted to those the phase 1 prompt may produce.
const phase1Category = z.enum([
  "PESTEL_POLITICAL",
  "PESTEL_ECONOMIC",
  "PESTEL_SOCIAL",
  "PESTEL_TECHNOLOGICAL",
  "PESTEL_ECOLOGICAL",
  "PESTEL_LEGAL",
  "TARGET_SEGMENT",
  "CUSTOMER_PROBLEM",
  "COMPETITOR",
  "RESOURCE",
  "SWOT_STRENGTH",
  "SWOT_WEAKNESS",
  "SWOT_OPPORTUNITY",
  "SWOT_THREAT",
  "MARKET_PATH",
]);

const phase1StatementSchema = z.object({
  category: phase1Category,
  content: z.string().trim().min(1),
  evidenceStatus: z.enum(["FACT", "ASSUMPTION", "OPEN_QUESTION"]),
  origin: z.enum(["USER_INPUT", "SIMULATED_RESEARCH", "AI_DERIVATION"]),
  justification: z.string().trim().min(1),
  sourceRef: z.string().trim().nullish(),
  uncertainty: z.string().trim().nullish(),
});

export const phase1ResponseSchema = z.object({
  statements: z.array(phase1StatementSchema).min(1),
});

export type Phase1Response = z.infer<typeof phase1ResponseSchema>;
export type Phase1Statement = z.infer<typeof phase1StatementSchema>;
