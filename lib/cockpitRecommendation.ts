import type { EvidenceStatus } from "@prisma/client";
import type { CockpitStepData } from "@/components/cockpit/types";

// Lower value = less secured assumption = higher cockpit priority.
const EVIDENCE_PRIORITY: Record<EvidenceStatus, number> = {
  OPEN_QUESTION: 0,
  ASSUMPTION: 1,
  FACT: 2,
};

export function taskProgress(step: CockpitStepData): {
  done: number;
  total: number;
  ratio: number;
} {
  const total = step.tasks.length;
  const done = step.tasks.filter((task) => task.done).length;
  return {
    done,
    total,
    ratio: total === 0 ? 0 : done / total,
  };
}

export function compareActiveSteps(a: CockpitStepData, b: CockpitStepData): number {
  const evidenceDiff =
    EVIDENCE_PRIORITY[a.assumptionEvidenceStatus] -
    EVIDENCE_PRIORITY[b.assumptionEvidenceStatus];
  if (evidenceDiff !== 0) return evidenceDiff;

  return taskProgress(a).ratio - taskProgress(b).ratio;
}

export function sortActiveSteps(steps: CockpitStepData[]): CockpitStepData[] {
  return [...steps].sort(compareActiveSteps);
}

export function recommendFocusStep(
  activeSteps: CockpitStepData[]
): { step: CockpitStepData | null; reason: string | null } {
  if (activeSteps.length === 0) {
    return { step: null, reason: null };
  }

  const sorted = sortActiveSteps(activeSteps);
  const focus = sorted[0];
  const runnerUp = sorted[1];

  if (
    !runnerUp ||
    EVIDENCE_PRIORITY[focus.assumptionEvidenceStatus] <
      EVIDENCE_PRIORITY[runnerUp.assumptionEvidenceStatus]
  ) {
    return {
      step: focus,
      reason:
        "Empfohlen, weil hier die geprüfte Annahme am wenigsten gesichert ist.",
    };
  }

  return {
    step: focus,
    reason: "Empfohlen, weil hier der geringste Aufgabenfortschritt liegt.",
  };
}

export function cockpitTaskTotals(steps: CockpitStepData[]): {
  done: number;
  total: number;
} {
  return steps.reduce(
    (acc, step) => {
      const progress = taskProgress(step);
      return {
        done: acc.done + progress.done,
        total: acc.total + progress.total,
      };
    },
    { done: 0, total: 0 }
  );
}
