import { z } from "zod";

export const evaluationModeSchema = z.enum(["PER_POINT", "CUMULATIVE"]);
export const metricValueTypeSchema = z.enum([
  "SCALAR",
  "COUNT",
  "COUNT_OF_TOTAL",
  "PERCENTAGE",
  "CURRENCY",
  "DURATION",
  "SCORE",
]);
export const aggregationStrategySchema = z.enum([
  "SUM",
  "LATEST",
  "AVERAGE",
  "RATE_FROM_SUMS",
  "NONE",
]);
export const metricRoleSchema = z.enum(["DECISIVE", "SUPPORTING"]);
export const proxyStrengthSchema = z.enum(["DIRECT", "PROXY"]);

export const evaluationRuleSchema = z
  .object({
    operator: z.enum(["GTE", "GT", "LTE", "LT", "EQ"]),
    value: z.number().finite().optional(),
    numerator: z.number().finite().nonnegative().optional(),
    ratio: z.number().finite().min(0).max(1).optional(),
    percentage: z.number().finite().min(0).max(100).optional(),
  })
  .superRefine((rule, ctx) => {
    const operands = [
      rule.value,
      rule.numerator,
      rule.ratio,
      rule.percentage,
    ].filter((value) => value !== undefined);
    if (operands.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Eine Bewertungsregel benötigt genau einen strukturierten Vergleichswert.",
      });
    }
  });

export const metricEvaluationConfigSchema = z.object({
  kind: metricValueTypeSchema,
  requiredDenominator: z.number().finite().positive().optional(),
  requiredObservations: z.number().finite().positive().optional(),
  success: evaluationRuleSchema,
  failure: evaluationRuleSchema,
});

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

export const metricInputSchema = z
  .object({
    name: z.string().trim().min(1),
    evaluationMode: evaluationModeSchema,
    valueType: metricValueTypeSchema.nullish(),
    aggregationStrategy: aggregationStrategySchema.nullish(),
    evaluationConfig: metricEvaluationConfigSchema.nullish(),
    numeratorLabel: z.string().trim().min(1).nullish(),
    denominatorLabel: z.string().trim().min(1).nullish(),
    observationUnit: z.string().trim().min(1).nullish(),
    metricRole: metricRoleSchema.default("DECISIVE"),
    signalCategory: signalCategorySchema.optional(),
    proxyStrength: proxyStrengthSchema.nullish(),
    signalRationale: z.string().trim().min(1).nullish(),
    successCriterion: z.string().trim().min(1),
    failureCriterion: z.string().trim().min(1),
  })
  .superRefine((metric, ctx) => {
    if (
      metric.valueType === "COUNT_OF_TOTAL" &&
      metric.aggregationStrategy &&
      !["RATE_FROM_SUMS", "LATEST", "NONE"].includes(
        metric.aggregationStrategy
      )
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["aggregationStrategy"],
        message:
          "COUNT_OF_TOTAL unterstützt RATE_FROM_SUMS, LATEST oder NONE.",
      });
    }
    if (
      metric.evaluationConfig &&
      metric.valueType &&
      metric.evaluationConfig.kind !== metric.valueType
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["evaluationConfig", "kind"],
        message: "Die Bewertungsregel muss zur Wertart der Messgröße passen.",
      });
    }
  });

/** LLM parse schema — effect-logic fields optional at parse time (enforced via V8 + repairOnce). */
export const metricLlmParseSchema = metricInputSchema.safeExtend({
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
export type MetricEvaluationConfig = z.infer<typeof metricEvaluationConfigSchema>;
export type MetricValueTypeValue = z.infer<typeof metricValueTypeSchema>;
export type AggregationStrategyValue = z.infer<typeof aggregationStrategySchema>;
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
