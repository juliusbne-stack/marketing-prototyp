import { z } from "zod";

export const evaluationModeSchema = z.enum(["PER_POINT", "CUMULATIVE"]);
export const metricRoleSchema = z.enum(["DECISIVE", "SUPPORTING"]);

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
  successCriterion: z.string().trim().min(1),
  failureCriterion: z.string().trim().min(1),
});

/** LLM output metric — signalCategory is required. */
export const metricLlmSchema = metricInputSchema.extend({
  signalCategory: signalCategorySchema,
});

export type MetricInput = z.infer<typeof metricInputSchema>;
export type MetricLlmOutput = z.infer<typeof metricLlmSchema>;
export type SignalCategoryValue = z.infer<typeof signalCategorySchema>;
export type StrategyDimensionValue = z.infer<typeof strategyDimensionSchema>;
export type TestSubjectValue = z.infer<typeof testSubjectSchema>;

/** At least one decisive metric per validation step. */
export function metricsHaveDecisive(
  metrics: Pick<MetricInput, "metricRole">[]
): boolean {
  return metrics.some((metric) => metric.metricRole === "DECISIVE");
}
