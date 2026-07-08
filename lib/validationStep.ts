import type { Prisma } from "@prisma/client";

/** Active steps shown in Phase 4 open validation and the implementation cockpit. */
export const activeValidationStepWhere = {
  discardedAt: null,
} as const satisfies Prisma.ValidationStepWhereInput;

type StepWithDependents = {
  tasks: { id: string }[];
  feedbacks: { id: string }[];
  metrics: { dataPoints: { id: string }[] }[];
};

/** True when tasks, KPI data points or market feedback reference this step. */
export function validationStepHasDependents(step: StepWithDependents): boolean {
  if (step.tasks.length > 0) return true;
  if (step.feedbacks.length > 0) return true;
  return step.metrics.some((metric) => metric.dataPoints.length > 0);
}
