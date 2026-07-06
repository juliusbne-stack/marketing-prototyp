import { z } from "zod";

// Zod schema mirroring the phase 3 JSON output format from docs/PROMPTS.md.
export const EVALUATION_CRITERIA = [
  "ATTRACTIVENESS",
  "RESOURCE_FIT",
  "RISK",
  "VALIDATION_EFFORT",
  "LEARNING_VALUE",
  "EVIDENCE",
] as const;

const criterionSchema = z.enum(EVALUATION_CRITERIA);

const scoreSchema = z.object({
  criterion: criterionSchema,
  score: z.number().int().min(1).max(5),
  rationale: z.string().trim().min(1),
});

const evaluationSchema = z.object({
  optionId: z.string().trim().min(1),
  scores: z
    .array(scoreSchema)
    .length(6)
    .refine(
      (scores) =>
        EVALUATION_CRITERIA.every((criterion) =>
          scores.some((score) => score.criterion === criterion)
        ),
      "Jede Option braucht genau einen Score je Kriterium."
    ),
});

export const phase3ResponseSchema = z.object({
  evaluations: z.array(evaluationSchema).min(1),
  recommendation: z.object({
    optionId: z.string().trim().min(1),
    rationale: z.string().trim().min(1),
    counterArguments: z.string().trim().min(1),
  }),
});

export type Phase3Response = z.infer<typeof phase3ResponseSchema>;
