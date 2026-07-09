import type { Laufmodus, TaskHerkunft } from "@prisma/client";

export type PriorImplementationTask = {
  title: string;
  done: boolean;
  herkunft: TaskHerkunft;
};

export type PriorImplementation = {
  id: string;
  title: string;
  channel: string | null;
  assumptionContent: string;
  hasFeedback: boolean;
  tasks: PriorImplementationTask[];
};

export type PriorImplementationContext = {
  id: string;
  title: string;
  channel: string | null;
  status: "abgeschlossen" | "in_umsetzung" | "ohne_aufgaben";
  tasks: { title: string; done: boolean }[];
};

export const LAUFMODUS_LABELS: Record<
  Exclude<Laufmodus, "EIGENSTAENDIG">,
  string
> = {
  PARALLEL: "parallel mitinstrumentiert",
  NACHGELAGERT: "nachgelagert",
};

export function normalizeChannel(channel: string | null | undefined): string | null {
  if (!channel) return null;
  const normalized = channel.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function channelsMatch(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  const na = normalizeChannel(a);
  const nb = normalizeChannel(b);
  return na !== null && nb !== null && na === nb;
}

function isPriorStepCompleted(step: PriorImplementation): boolean {
  if (step.hasFeedback) return true;
  const actionable = step.tasks.filter((task) => task.herkunft !== "BEREITS_ERFUELLT");
  return actionable.length > 0 && actionable.every((task) => task.done);
}

function isPriorStepInProgress(step: PriorImplementation): boolean {
  if (step.hasFeedback) return false;
  const actionable = step.tasks.filter((task) => task.herkunft !== "BEREITS_ERFUELLT");
  return actionable.length > 0 && actionable.some((task) => !task.done);
}

export function derivePriorStepStatus(
  step: PriorImplementation
): PriorImplementationContext["status"] {
  if (step.tasks.length === 0) return "ohne_aufgaben";
  if (isPriorStepCompleted(step)) return "abgeschlossen";
  if (isPriorStepInProgress(step)) return "in_umsetzung";
  return "ohne_aufgaben";
}

export function buildPriorImplementationContext(
  steps: PriorImplementation[]
): PriorImplementationContext[] {
  return steps.map((step) => ({
    id: step.id,
    title: step.title,
    channel: step.channel,
    status: derivePriorStepStatus(step),
    tasks: step.tasks.map((task) => ({
      title: task.title,
      done: task.done,
    })),
  }));
}

export function findSameChannelPriorSteps(
  currentChannel: string | null | undefined,
  priorSteps: PriorImplementation[]
): PriorImplementation[] {
  return priorSteps.filter((step) => channelsMatch(step.channel, currentChannel));
}

export function deriveLaufmodusAndBasis(
  currentChannel: string | null | undefined,
  priorSteps: PriorImplementation[]
): { laufmodus: Laufmodus; basiertAufUmsetzungId: string | null } {
  const sameChannel = findSameChannelPriorSteps(currentChannel, priorSteps);
  if (sameChannel.length === 0) {
    return { laufmodus: "EIGENSTAENDIG", basiertAufUmsetzungId: null };
  }

  const completed = sameChannel.filter(isPriorStepCompleted);
  if (completed.length > 0) {
    const basis = completed[completed.length - 1]!;
    return { laufmodus: "NACHGELAGERT", basiertAufUmsetzungId: basis.id };
  }

  const inProgress = sameChannel.filter(isPriorStepInProgress);
  if (inProgress.length > 0) {
    const basis = inProgress[inProgress.length - 1]!;
    return { laufmodus: "PARALLEL", basiertAufUmsetzungId: basis.id };
  }

  return { laufmodus: "EIGENSTAENDIG", basiertAufUmsetzungId: null };
}

/** Case-insensitive title overlap for BEREITS_ERFUELLT guard. */
export function findMatchingDoneTask(
  taskTitle: string,
  priorStep: PriorImplementation
): PriorImplementationTask | null {
  const needle = taskTitle.trim().toLowerCase();
  return (
    priorStep.tasks.find(
      (task) =>
        task.done &&
        task.herkunft !== "BEREITS_ERFUELLT" &&
        (task.title.trim().toLowerCase() === needle ||
          task.title.trim().toLowerCase().includes(needle) ||
          needle.includes(task.title.trim().toLowerCase()))
    ) ?? null
  );
}

export function validateBereitsErfuelltTask(
  taskTitle: string,
  erfuelltDurchUmsetzungId: string | null,
  priorSteps: PriorImplementation[]
): { valid: boolean; stepId: string | null } {
  if (!erfuelltDurchUmsetzungId) {
    return { valid: false, stepId: null };
  }
  const priorStep = priorSteps.find((step) => step.id === erfuelltDurchUmsetzungId);
  if (!priorStep) {
    return { valid: false, stepId: null };
  }
  const match = findMatchingDoneTask(taskTitle, priorStep);
  return { valid: match !== null, stepId: priorStep.id };
}
