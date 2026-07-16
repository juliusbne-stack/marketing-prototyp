import { z } from "zod";

// User-selected simulation scenario (request-level only, not persisted).
export const kpiScenarioSchema = z.enum([
  "SUPPORTING",
  "MIXED",
  "CONTRADICTING",
]);

export type KpiScenario = z.infer<typeof kpiScenarioSchema>;

/** LLMs often emit JSON null for omitted fields — treat null like undefined. */
const optionalFiniteNumber = z.preprocess(
  (value) => (value === null ? undefined : value),
  z.number().finite().optional()
);
const optionalNonNegativeNumber = z.preprocess(
  (value) => (value === null ? undefined : value),
  z.number().finite().nonnegative().optional()
);
const optionalPositiveNumber = z.preprocess(
  (value) => (value === null ? undefined : value),
  z.number().finite().positive().optional()
);

export const kpiDataPointInputSchema = z
  .object({
    periodLabel: z.string().trim().min(1),
    value: optionalFiniteNumber,
    numerator: optionalNonNegativeNumber,
    denominator: optionalPositiveNumber,
    assessment: z.enum(["SUPPORTING", "NEUTRAL", "CONTRADICTING"]),
  })
  .superRefine((point, ctx) => {
    const hasValue = point.value !== undefined;
    const hasRatio =
      point.numerator !== undefined || point.denominator !== undefined;
    if (hasValue === hasRatio) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Ein Datenpunkt benötigt entweder einen Einzelwert oder getrennte Angaben für Treffer und Beobachtungen.",
      });
      return;
    }
    if (
      hasRatio &&
      (point.numerator === undefined || point.denominator === undefined)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Für Verhältniswerte müssen Treffer und Beobachtungen gemeinsam angegeben werden.",
      });
    }
    if (
      point.numerator !== undefined &&
      point.denominator !== undefined &&
      point.numerator > point.denominator
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["numerator"],
        message: "Die Trefferzahl darf nicht größer als die Beobachtungszahl sein.",
      });
    }
  });

// Zod schema mirroring the KPI simulation JSON output (docs/PROMPTS.md,
// Umsetzungs-Cockpit).
export const kpiSimulationResponseSchema = z.object({
  series: z
    .array(
      z.object({
        metricId: z.string().trim().min(1),
        points: z
          .array(kpiDataPointInputSchema)
          .min(3)
          .max(5),
      })
    )
    .min(1),
});

export type KpiSimulationResponse = z.infer<typeof kpiSimulationResponseSchema>;
export type KpiDataPointInput = z.infer<typeof kpiDataPointInputSchema>;
