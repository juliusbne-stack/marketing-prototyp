import { z } from "zod";
import { EvidenceStatus } from "@prisma/client";
import {
  metricInputSchema,
  metricsHaveDecisive,
} from "@/lib/schemas/metric";

const revisedStatementSchema = z.object({
  content: z.string().trim().min(1),
  evidenceStatus: z.nativeEnum(EvidenceStatus),
  justification: z.string().trim().min(1).nullable(),
  uncertainty: z.string().trim().min(1).nullable(),
});

const revisedValidationStepSchema = z.object({
  validationQuestion: z.string().trim().min(1),
  testDesign: z.string().trim().min(1),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  marketingActivities: z.array(z.string().trim().min(1)).min(2).max(6),
  channel: z.string().trim().min(1).nullish(),
  timeframe: z.string().trim().min(1),
  budgetFrame: z.string().trim().min(1),
});

export const phase4RefineValidationResponseSchema = z
  .object({
    revisedStatement: revisedStatementSchema,
    revisedValidationStep: revisedValidationStepSchema,
    revisedMetrics: z.array(metricInputSchema).min(1).max(3),
    rationale: z.string().trim().min(1),
    strategyAdjustmentHint: z.string().trim().min(1).nullable().optional(),
  })
  .refine(
    (data) => metricsHaveDecisive(data.revisedMetrics),
    "Mindestens eine entscheidende Metrik (DECISIVE) ist erforderlich."
  );

export type Phase4RefineValidationResponse = z.infer<
  typeof phase4RefineValidationResponseSchema
>;
