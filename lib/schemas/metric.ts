import { z } from "zod";

export const metricTypeSchema = z.enum(["RATE", "CUMULATIVE"]);

export const metricInputSchema = z.object({
  name: z.string().trim().min(1),
  metricType: metricTypeSchema,
  successCriterion: z.string().trim().min(1),
  failureCriterion: z.string().trim().min(1),
});

export type MetricInput = z.infer<typeof metricInputSchema>;
