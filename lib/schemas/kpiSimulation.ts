import { z } from "zod";

// User-selected simulation scenario (request-level only, not persisted).
export const kpiScenarioSchema = z.enum([
  "SUPPORTING",
  "MIXED",
  "CONTRADICTING",
]);

export type KpiScenario = z.infer<typeof kpiScenarioSchema>;

// Zod schema mirroring the KPI simulation JSON output (docs/PROMPTS.md,
// Umsetzungs-Cockpit).
export const kpiSimulationResponseSchema = z.object({
  series: z
    .array(
      z.object({
        metricId: z.string().trim().min(1),
        points: z
          .array(
            z.object({
              periodLabel: z.string().trim().min(1),
              value: z.string().trim().min(1),
              assessment: z.enum(["SUPPORTING", "NEUTRAL", "CONTRADICTING"]),
            })
          )
          .min(3)
          .max(5),
      })
    )
    .min(1),
});

export type KpiSimulationResponse = z.infer<typeof kpiSimulationResponseSchema>;
