import type { EvaluationMode } from "@prisma/client";
import type { StatementData } from "@/components/statements/types";
import type { StepReadinessInput } from "@/lib/cockpitPeriod";

// Client-side shape of a validation step, matching app/api/ai/4/route.ts
// and app/api/steps/route.ts.
export type MetricData = {
  id: string;
  name: string;
  evaluationMode: EvaluationMode;
  successCriterion: string;
  failureCriterion: string;
};

export type StepData = {
  id: string;
  projectId: string;
  optionId: string;
  assumptionId: string;
  title: string;
  description: string;
  channel: string | null;
  timeframe: string | null;
  budgetFrame: string | null;
  adopted: boolean;
  metrics: MetricData[];
  // Cockpit task progress ("Aufgaben 3/6"), computed server-side; absent in
  // API responses that don't load tasks.
  taskProgress?: { done: number; total: number } | null;
  // Minimal cockpit snapshot for readiness derivation in phase 4; absent in
  // API responses that don't load tasks or KPI data points.
  cockpitReadinessInput?: StepReadinessInput;
};

// Phase 4 groups steps under their tested critical assumption.
export type StepWithAssumption = StepData & { assumption: StatementData };

// Slim shape of the prioritized option shown in the phase 4/5 header.
export type PrioritizedOptionData = {
  id: string;
  title: string;
  summary: string | null;
  prioritizationRationale: string | null;
};
