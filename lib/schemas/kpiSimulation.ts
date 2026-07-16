import { z } from "zod";

// User-selected simulation scenario (request-level only, not persisted).
export const kpiScenarioSchema = z.enum([
  "SUPPORTING",
  "MIXED",
  "CONTRADICTING",
]);

export type KpiScenario = z.infer<typeof kpiScenarioSchema>;

export const kpiDataPointInputSchema = z
  .object({
    periodLabel: z.string().trim().min(1),
    value: z.number().finite().optional(),
    numerator: z.number().finite().nonnegative().optional(),
    denominator: z.number().finite().positive().optional(),
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
