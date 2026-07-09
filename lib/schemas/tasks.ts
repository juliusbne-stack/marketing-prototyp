import { z } from "zod";

const taskHerkunftSchema = z.enum(["NEU", "GETEILT", "BEREITS_ERFUELLT"]);

const taskItemSchema = z.object({
  title: z.string().trim().min(1),
  hint: z.string().trim().min(1),
  annahmenBezugId: z.string().trim().min(1).nullable(),
  erfolgskriterium: z.string().trim().min(1),
  herkunft: taskHerkunftSchema.default("NEU"),
  erfuelltDurchUmsetzungId: z.string().trim().min(1).nullable(),
});

// Zod schema mirroring the task decomposition JSON output (docs/PROMPTS.md,
// Umsetzungs-Cockpit).
export const tasksResponseSchema = z.object({
  tasks: z.array(taskItemSchema).min(3).max(7),
});

export type TasksResponse = z.infer<typeof tasksResponseSchema>;
export type TaskItemResponse = z.infer<typeof taskItemSchema>;

export function tasksResponseSchemaWithValidIds(
  validIds: Set<string>,
  priorStepIds: Set<string>
) {
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

      if (
        (task.herkunft === "BEREITS_ERFUELLT" ||
          task.herkunft === "GETEILT") &&
        (task.erfuelltDurchUmsetzungId === null ||
          !priorStepIds.has(task.erfuelltDurchUmsetzungId))
      ) {
        ctx.addIssue({
          code: "custom",
          message: `erfuelltDurchUmsetzungId ist für herkunft=${task.herkunft} eine gültige Vor-Umsetzungs-ID erforderlich.`,
          path: ["tasks", index, "erfuelltDurchUmsetzungId"],
        });
      }

      if (
        task.herkunft === "NEU" &&
        task.erfuelltDurchUmsetzungId !== null
      ) {
        ctx.addIssue({
          code: "custom",
          message: "erfuelltDurchUmsetzungId darf bei herkunft=NEU nicht gesetzt sein.",
          path: ["tasks", index, "erfuelltDurchUmsetzungId"],
        });
      }
    });
  });
}
