import { z } from "zod";

export const evaluationModeSchema = z.enum(["PER_POINT", "CUMULATIVE"]);
export const metricRoleSchema = z.enum(["DECISIVE", "SUPPORTING"]);
export const proxyStrengthSchema = z.enum(["DIRECT", "PROXY"]);

export const signalCategorySchema = z.enum([
  "COMMITMENT",
  "BEHAVIOR",
  "ATTENTION",
  "QUALITATIVE",
]);

export const strategyDimensionSchema = z.enum([
  "TARGET_GROUP",
  "CUSTOMER_PROBLEM",
  "VALUE_PROPOSITION",
  "POSITIONING",
  "MARKET_ACCESS",
  "REVENUE_GROWTH",
]);

export const testSubjectSchema = z.enum([
  "WILLINGNESS_TO_PAY",
  "REACHABILITY",
  "PROBLEM_RELEVANCE",
  "VALUE_UNDERSTANDING",
  "DIFFERENTIATION",
  "REVENUE_MECHANICS",
  "OTHER",
]);

export const metricInputSchema = z.object({
  name: z.string().trim().min(1),
  evaluationMode: evaluationModeSchema,
  metricRole: metricRoleSchema.default("DECISIVE"),
  signalCategory: signalCategorySchema.optional(),
  proxyStrength: proxyStrengthSchema.nullish(),
  signalRationale: z.string().trim().min(1).nullish(),
  successCriterion: z.string().trim().min(1),
  failureCriterion: z.string().trim().min(1),
});

/** LLM parse schema — effect-logic fields optional at parse time (enforced via V8 + repairOnce). */
export const metricLlmParseSchema = metricInputSchema.extend({
  signalCategory: signalCategorySchema,
});

/**
 * Strict validation for tests/tooling. Production uses metricLlmParseSchema + V8 in guards.
 */
export const metricLlmSchema = metricLlmParseSchema.superRefine((metric, ctx) => {
  if (metric.metricRole !== "DECISIVE") return;

  if (!metric.proxyStrength) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Entscheidende Metriken (DECISIVE) benötigen proxyStrength (DIRECT | PROXY).",
      path: ["proxyStrength"],
    });
  }

  if (!metric.signalRationale?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Entscheidende Metriken (DECISIVE) benötigen signalRationale mit Bezug zur Annahme.",
      path: ["signalRationale"],
    });
  }
});

export type MetricInput = z.infer<typeof metricInputSchema>;
export type MetricLlmOutput = z.infer<typeof metricLlmParseSchema>;
export type SignalCategoryValue = z.infer<typeof signalCategorySchema>;
export type ProxyStrengthValue = z.infer<typeof proxyStrengthSchema>;
export type StrategyDimensionValue = z.infer<typeof strategyDimensionSchema>;
export type TestSubjectValue = z.infer<typeof testSubjectSchema>;

/** At least one decisive metric per validation step. */
export function metricsHaveDecisive(
  metrics: Pick<MetricInput, "metricRole">[]
): boolean {
  return metrics.some((metric) => metric.metricRole === "DECISIVE");
}
