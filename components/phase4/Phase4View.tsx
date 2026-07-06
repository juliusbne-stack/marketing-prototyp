"use client";

import { useState } from "react";
import { Star, TestTubeDiagonal } from "lucide-react";
import type { StatementData } from "@/components/statements/types";
import { StatementCard } from "@/components/statements/StatementCard";
import { PhaseAdvanceButton } from "@/components/wizard/PhaseAdvanceButton";
import {
  PhaseEmptyState,
  PhaseErrorState,
  PhaseLoadingState,
} from "@/components/wizard/phaseStates";
import { ValidationStepCard } from "./ValidationStepCard";
import type { PrioritizedOptionData, StepWithAssumption } from "./types";

export function Phase4View({
  projectId,
  option,
  initialSteps,
}: {
  projectId: string;
  option: PrioritizedOptionData | null;
  initialSteps: StepWithAssumption[];
}) {
  const [steps, setSteps] = useState(initialSteps);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasSteps = steps.length > 0;
  const hasDrafts = steps.some((step) => !step.adopted);
  const hasAdoptedStep = steps.some((step) => step.adopted);

  // Precondition for phase 5: at least one adopted validation step (M5).
  const advanceButton = (
    <PhaseAdvanceButton
      projectId={projectId}
      nextPhase={5}
      enabled={hasAdoptedStep}
      disabledHint="Übernimm zuerst mindestens einen Umsetzungsschritt in den Projektstand."
    />
  );

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/4", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          body?.error ??
            "Die KI-Antwort konnte nicht verarbeitet werden. Erneut versuchen — deine Priorisierung bleibt erhalten."
        );
      }
      setSteps(body.steps);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Die KI-Antwort konnte nicht verarbeitet werden. Erneut versuchen — deine Priorisierung bleibt erhalten."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  function handleStepChanged(updated: StepWithAssumption) {
    setSteps((current) =>
      current.map((step) =>
        step.id === updated.id ? { ...updated, assumption: step.assumption } : step
      )
    );
  }

  function handleStepDeleted(id: string) {
    setSteps((current) => current.filter((step) => step.id !== id));
  }

  function handleAssumptionChanged(updated: StatementData) {
    setSteps((current) =>
      current.map((step) =>
        step.assumptionId === updated.id ? { ...step, assumption: updated } : step
      )
    );
  }

  if (!option) {
    return (
      <div className="flex flex-col gap-6">
        <PhaseEmptyState>
          In dieser Phase werden die kritischsten Annahmen deiner priorisierten
          Option in prüfbare Umsetzungsschritte übersetzt. Priorisiere zuerst
          in Phase 3 eine Option.
        </PhaseEmptyState>
        {advanceButton}
      </div>
    );
  }

  // Steps grouped under their critical assumption (UI_KONZEPT §4, phase 4).
  const assumptionGroups: { assumption: StatementData; steps: StepWithAssumption[] }[] = [];
  for (const step of steps) {
    const group = assumptionGroups.find(
      (entry) => entry.assumption.id === step.assumptionId
    );
    if (group) {
      group.steps.push(step);
    } else {
      assumptionGroups.push({ assumption: step.assumption, steps: [step] });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-[10px] border-2 border-accent bg-surface p-4">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
          <Star className="h-3.5 w-3.5" aria-hidden />
          Priorisierte Option
        </p>
        <h4 className="mt-2 font-heading text-base font-medium text-text">
          {option.title}
        </h4>
        {option.summary && (
          <p className="mt-1 text-sm text-text-muted">{option.summary}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-border bg-surface px-4 py-3">
        <p className="text-sm text-text-muted">
          {hasSteps
            ? "Erneutes Ableiten ersetzt nur Entwürfe — übernommene Schritte bleiben erhalten."
            : "Die KI markiert die 2–4 kritischsten Annahmen und übersetzt sie in prüfbare Umsetzungsschritte."}
        </p>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
        >
          <TestTubeDiagonal className="h-4 w-4" aria-hidden />
          {isGenerating
            ? "Schritte werden abgeleitet …"
            : hasSteps
              ? "Umsetzungsschritte erneut ableiten"
              : "Umsetzungsschritte ableiten"}
        </button>
      </div>

      {error && <PhaseErrorState message={error} />}

      {isGenerating && <PhaseLoadingState phase={4} variant="step" />}

      {hasSteps && !isGenerating && (
        <section aria-label="Kritische Annahmen" className="flex flex-col gap-6">
          <div>
            <h3 className="font-heading text-base font-medium text-text">
              Kritische Annahmen ({assumptionGroups.length})
            </h3>
            <p className="mt-1 text-sm text-text-muted">
              {hasDrafts
                ? "Prüfe die Entwürfe, passe sie bei Bedarf an und übernimm die Schritte in den Projektstand — erst dann stehen sie in Phase 5 für Rückmeldungen bereit."
                : "Alle Umsetzungsschritte sind übernommen. In Phase 5 erfasst du die Marktrückmeldungen dazu."}
            </p>
          </div>
          {assumptionGroups.map((group) => (
            <div key={group.assumption.id} className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Kritische Annahme
              </p>
              <StatementCard
                statement={group.assumption}
                onChanged={handleAssumptionChanged}
              />
              <div className="flex flex-col gap-3 border-l-2 border-accent/30 pl-4 md:ml-4">
                {group.steps.map((step) => (
                  <ValidationStepCard
                    key={step.id}
                    step={step}
                    onChanged={(updated) =>
                      handleStepChanged({ ...updated, assumption: step.assumption })
                    }
                    onDeleted={handleStepDeleted}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {!hasSteps && !isGenerating && (
        <PhaseEmptyState>
          In dieser Phase werden die kritischsten Annahmen deiner priorisierten
          Option in begrenzte Umsetzungsschritte mit Messpunkten übersetzt.
          Starte mit „Umsetzungsschritte ableiten“.
        </PhaseEmptyState>
      )}

      {advanceButton}
    </div>
  );
}
