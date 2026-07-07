import { z } from "zod";
import { optionDimensionEvidenceStatus } from "./evidenceStatus";

// Zod schema mirroring the phase 5 JSON output format from docs/PROMPTS.md.
const assessmentSchema = z.object({
  feedbackId: z.string().trim().min(1),
  statementId: z.string().trim().min(1),
  result: z.enum(["SUPPORTED", "PARTIALLY_SUPPORTED", "REFUTED", "AMBIGUOUS"]),
  interpretation: z.string().trim().min(1),
  proposedNewStatus: z.enum(["FACT", "ASSUMPTION", "OPEN_QUESTION"]).nullish(),
});

const newStatementSchema = z.object({
  category: z.literal("LEARNING"),
  content: z.string().trim().min(1),
  evidenceStatus: optionDimensionEvidenceStatus,
  origin: z.literal("AI_DERIVATION"),
  justification: z.string().trim().min(1),
  uncertainty: z.string().trim().nullish(),
});

const adaptationSchema = z
  .object({
    decision: z.enum(["CONTINUE", "ADAPT", "DEFER", "DISCARD", "LOOP_BACK"]),
    loopBackToPhase: z.number().int().min(1).max(3).nullish(),
    rationale: z.string().trim().min(1),
  })
  .refine(
    (data) => data.decision !== "LOOP_BACK" || data.loopBackToPhase != null,
    "Bei LOOP_BACK muss loopBackToPhase (1–3) angegeben sein."
  );

export const phase5ResponseSchema = z.object({
  feedbackAssessments: z.array(assessmentSchema).min(1),
  newStatements: z.array(newStatementSchema).max(3),
  adaptation: adaptationSchema,
});

export type Phase5Response = z.infer<typeof phase5ResponseSchema>;
