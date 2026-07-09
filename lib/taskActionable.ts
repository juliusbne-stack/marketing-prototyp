import type { TaskHerkunft } from "@prisma/client";

/** Actionable tasks exclude BEREITS_ERFUELLT references (no checkbox). */
export function isActionableTask(herkunft: TaskHerkunft): boolean {
  return herkunft !== "BEREITS_ERFUELLT";
}

export function countActionableTasks(
  tasks: { done: boolean; herkunft: TaskHerkunft }[]
): { done: number; total: number } {
  const actionable = tasks.filter((task) => isActionableTask(task.herkunft));
  return {
    done: actionable.filter((task) => task.done).length,
    total: actionable.length,
  };
}
