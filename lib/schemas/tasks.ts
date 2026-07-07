import { z } from "zod";

// Zod schema mirroring the task decomposition JSON output (docs/PROMPTS.md,
// Umsetzungs-Cockpit).
export const tasksResponseSchema = z.object({
  tasks: z
    .array(
      z.object({
        title: z.string().trim().min(1),
        hint: z.string().trim().min(1),
      })
    )
    .min(3)
    .max(7),
});

export type TasksResponse = z.infer<typeof tasksResponseSchema>;
