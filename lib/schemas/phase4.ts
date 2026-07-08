import { z } from "zod";
import {
  metricLlmSchema,
  metricsHaveDecisive,
  strategyDimensionSchema,
  testSubjectSchema,
} from "@/lib/schemas/metric";

const stepLlmSchema = z.object({
  assumptionId: z.string().trim().min(1),
  strategyDimension: strategyDimensionSchema,
  testSubject: testSubjectSchema,
  validationQuestion: z.string().trim().min(1),
  testDesign: z.string().trim().min(1),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  marketingActivities: z.array(z.string().trim().min(1)).min(2).max(6),
  channel: z.string().trim().min(1).nullish(),
  timeframe: z.string().trim().min(1),
  budgetFrame: z.string().trim().min(1),
  metrics: z.array(metricLlmSchema).min(1).max(3),
});

export type Phase4StepOutput = z.infer<typeof stepLlmSchema>;

const stepsRefine = (steps: Phase4StepOutput[]) =>
  steps.every((step) => metricsHaveDecisive(step.metrics));

const baseResponseSchema = z.object({
  criticalAssumptions: z.array(z.string().trim().min(1)),
  steps: z.array(stepLlmSchema),
  diversityNote: z.string().trim().min(1).nullish(),
  modeNote: z.string().trim().min(1).nullish(),
});

export const phase4LlmResponseSchema = baseResponseSchema
  .refine(
    (data) => stepsRefine(data.steps),
    "Jeder Schritt braucht mindestens eine entscheidende Metrik (DECISIVE)."
  )
  .refine(
    (data) =>
      data.steps.every((step) =>
        data.criticalAssumptions.includes(step.assumptionId)
      ),
    "Jeder Schritt muss eine kritische Annahme aus criticalAssumptions referenzieren."
  );

export type Phase4LlmResponse = z.infer<typeof phase4LlmResponseSchema>;

export const phase4ResponseSchema = phase4LlmResponseSchema
  .refine(
    (data) => data.criticalAssumptions.length >= 2 && data.criticalAssumptions.length <= 4,
    "2–4 kritische Annahmen erforderlich."
  )
  .refine(
    (data) => data.steps.length >= 2 && data.steps.length <= 4,
    "2–4 Umsetzungsschritte erforderlich."
  )
  .refine(
    (data) =>
      data.criticalAssumptions.every((id) =>
        data.steps.some((step) => step.assumptionId === id)
      ),
    "Jede kritische Annahme braucht genau einen Umsetzungsschritt."
  )
  .refine(
    (data) =>
      new Set(data.steps.map((step) => step.assumptionId)).size ===
      data.steps.length,
    "Keine doppelte assumptionId zwischen Schritten."
  );

export type Phase4Response = z.infer<typeof phase4ResponseSchema>;

export const phase4ScaleResponseSchema = phase4LlmResponseSchema
  .refine(
    (data) => data.criticalAssumptions.length >= 1 && data.criticalAssumptions.length <= 4,
    "1–4 gestützte Kernannahmen erforderlich."
  )
  .refine(
    (data) => data.steps.length >= 2 && data.steps.length <= 4,
    "2–4 Skalierungsschritte erforderlich."
  );

export type Phase4ScaleResponse = z.infer<typeof phase4ScaleResponseSchema>;

// Legacy step schema for refine routes (no strategyDimension yet on refine output).
import { metricInputSchema } from "@/lib/schemas/metric";

const legacyStepSchema = z.object({
  assumptionId: z.string().trim().min(1),
  validationQuestion: z.string().trim().min(1),
  testDesign: z.string().trim().min(1),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  marketingActivities: z.array(z.string().trim().min(1)).min(2).max(6),
  channel: z.string().trim().min(1).nullish(),
  timeframe: z.string().trim().min(1),
  budgetFrame: z.string().trim().min(1),
  metrics: z.array(metricInputSchema).min(1).max(3),
});

export { legacyStepSchema as stepSchema };
