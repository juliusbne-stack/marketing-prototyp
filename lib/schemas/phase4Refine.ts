import { z } from "zod";
import { metricInputSchema } from "@/lib/schemas/metric";

// Zod schema mirroring the phase 4 refinement JSON output format
// (lib/prompts/phase4Refine.ts).
const metricSchema = metricInputSchema;

export const phase4RefineResponseSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  channel: z.string().trim().min(1).nullish(),
  timeframe: z.string().trim().min(1),
  budgetFrame: z.string().trim().min(1),
  metrics: z.array(metricSchema).min(1).max(2),
  changeSummary: z.string().trim().min(1),
});

export type Phase4RefineResponse = z.infer<typeof phase4RefineResponseSchema>;
