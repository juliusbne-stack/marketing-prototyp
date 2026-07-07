import { z } from "zod";

const taskItemSchema = z.object({
  title: z.string().trim().min(1),
  hint: z.string().trim().min(1),
  annahmenBezugId: z.string().trim().min(1).nullable(),
  erfolgskriterium: z.string().trim().min(1),
});

// Zod schema mirroring the task decomposition JSON output (docs/PROMPTS.md,
// Umsetzungs-Cockpit).
export const tasksResponseSchema = z.object({
  tasks: z.array(taskItemSchema).min(3).max(7),
});

export type TasksResponse = z.infer<typeof tasksResponseSchema>;

export function tasksResponseSchemaWithValidIds(validIds: Set<string>) {
  return tasksResponseSchema.superRefine((data, ctx) => {
    data.tasks.forEach((task, index) => {
      if (
        task.annahmenBezugId !== null &&
        !validIds.has(task.annahmenBezugId)
      ) {
        ctx.addIssue({
          code: "custom",
          message: `annahmenBezugId "${task.annahmenBezugId}" ist keine gültige Aussage-ID aus dem Kontext.`,
          path: ["tasks", index, "annahmenBezugId"],
        });
      }
    });
  });
}
