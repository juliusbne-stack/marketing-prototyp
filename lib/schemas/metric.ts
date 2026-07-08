import { z } from "zod";

export const evaluationModeSchema = z.enum(["PER_POINT", "CUMULATIVE"]);

export const metricInputSchema = z.object({
  name: z.string().trim().min(1),
  evaluationMode: evaluationModeSchema,
  successCriterion: z.string().trim().min(1),
  failureCriterion: z.string().trim().min(1),
});

export type MetricInput = z.infer<typeof metricInputSchema>;
