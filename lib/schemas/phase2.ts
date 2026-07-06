import { z } from "zod";

// Zod schema mirroring the phase 2 JSON output format from docs/PROMPTS.md.
export const OPTION_DIMENSION_CATEGORIES = [
  "OPT_TARGET_GROUP",
  "OPT_CUSTOMER_PROBLEM",
  "OPT_VALUE_PROPOSITION",
  "OPT_POSITIONING",
  "OPT_MARKET_ACCESS",
  "OPT_REVENUE_GROWTH",
] as const;

const dimensionCategory = z.enum(OPTION_DIMENSION_CATEGORIES);

const dimensionSchema = z.object({
  category: dimensionCategory,
  content: z.string().trim().min(1),
  // Dimensions of a new option are never FACT (prompt rule).
  evidenceStatus: z.enum(["ASSUMPTION", "OPEN_QUESTION"]),
  origin: z.literal("AI_DERIVATION"),
  justification: z.string().trim().min(1),
  uncertainty: z.string().trim().nullish(),
});

const optionSchema = z.object({
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  dimensions: z
    .array(dimensionSchema)
    .length(6)
    .refine(
      (dimensions) =>
        OPTION_DIMENSION_CATEGORIES.every((category) =>
          dimensions.some((dimension) => dimension.category === category)
        ),
      "Jede Option braucht genau eine Aussage je Dimension."
    ),
});

export const phase2ResponseSchema = z.object({
  options: z.array(optionSchema).min(2).max(3),
});

export type Phase2Response = z.infer<typeof phase2ResponseSchema>;
export type Phase2Option = z.infer<typeof optionSchema>;
