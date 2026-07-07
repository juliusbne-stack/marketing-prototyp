import { z } from "zod";

// Zod schema mirroring the phase 4 JSON output format from docs/PROMPTS.md.
const metricSchema = z.object({
  name: z.string().trim().min(1),
  successCriterion: z.string().trim().min(1),
  failureCriterion: z.string().trim().min(1),
});

const stepSchema = z.object({
  assumptionId: z.string().trim().min(1),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  channel: z.string().trim().min(1).nullish(),
  metrics: z.array(metricSchema).min(1).max(2),
});

export const phase4ResponseSchema = z
  .object({
    criticalAssumptions: z.array(z.string().trim().min(1)).min(2).max(4),
    steps: z.array(stepSchema).min(2).max(4),
  })
  .refine(
    (data) =>
      data.steps.every((step) =>
        data.criticalAssumptions.includes(step.assumptionId)
      ) &&
      data.criticalAssumptions.every((id) =>
        data.steps.some((step) => step.assumptionId === id)
      ),
    "Jede kritische Annahme braucht genau einen Umsetzungsschritt."
  );

export type Phase4Response = z.infer<typeof phase4ResponseSchema>;

// Scaling variant (continuation mode): same JSON shape, but steps reference
// already SUPPORTED critical assumptions — several steps may observe the same
// assumption, so there is no 1:1 pairing requirement.
export const phase4ScaleResponseSchema = z
  .object({
    criticalAssumptions: z.array(z.string().trim().min(1)).min(1).max(4),
    steps: z.array(stepSchema).min(2).max(4),
  })
  .refine(
    (data) =>
      data.steps.every((step) =>
        data.criticalAssumptions.includes(step.assumptionId)
      ),
    "Jeder Ausweitungsschritt muss eine der gestützten Kernannahmen referenzieren."
  );

export type Phase4ScaleResponse = z.infer<typeof phase4ScaleResponseSchema>;
