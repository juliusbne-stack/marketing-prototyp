"use client";

import { useMemo, useState } from "react";
import { Star, TestTubeDiagonal, TrendingUp } from "lucide-react";
import { ProgressButton } from "@/components/ui/ProgressButton";
import type { FeedbackData } from "@/components/phase5/types";
import type { StatementData } from "@/components/statements/types";
import { StatementCard } from "@/components/statements/StatementCard";
import { CollapsibleSection } from "@/components/wizard/CollapsibleSection";
import { CockpitNavigateButton } from "@/components/wizard/CockpitNavigateButton";
import {
  PhaseEmptyState,
  PhaseErrorState,
  PhaseLoadingState,
} from "@/components/wizard/phaseStates";
import {
  buildValidationHistoryMap,
  getAssessedFeedbackForStep,
  getOpenValidationIntro,
  isAssumptionPreviouslyValidated,
  isStepCompleted,
} from "@/lib/validation";
import { AnchorAssumptionHeading } from "./AnchorAssumptionHeading";
import { CompletedAssumptionCard } from "./CompletedAssumptionCard";
import { ValidationStepCard } from "./ValidationStepCard";
import type { PrioritizedOptionData, StepWithAssumption } from "./types";

export function Phase4View({
  projectId,
  option,
  initialSteps,
  initialFeedbacks,
  continuationMode,
}: {
  projectId: string;
  option: PrioritizedOptionData | null;
  initialSteps: StepWithAssumption[];
  initialFeedbacks: FeedbackData[];
  // Latest confirmed phase 5 decision is CONTINUE: offer controlled scaling.
  continuationMode: boolean;
}) {
  const [steps, setSteps] = useState(initialSteps);
  const [feedbacks] = useState(initialFeedbacks);
  const validationHistoryMap = useMemo(
    () => buildValidationHistoryMap(feedbacks),
    [feedbacks]
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isScaling, setIsScaling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isBusy = isGenerating || isScaling;

  const hasSteps = steps.length > 0;
  const hasDrafts = steps.some((step) => !step.adopted);
  const hasAdoptedStep = steps.some((step) => step.adopted);

  const cockpitButton = (
    <CockpitNavigateButton
      projectId={projectId}
      enabled={hasAdoptedStep}
      disabledHint="Übernimm zuerst mindestens einen Umsetzungsschritt in den Projektstand — dann startest du die Umsetzung im Cockpit."
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

  // Continuation mode: derive limited scaling steps for the supported core
  // assumptions (no new validation experiments, dimensions stay untouched).
  async function handleScale() {
    setIsScaling(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/4/scale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          body?.error ??
            "Die Skalierungsschritte konnten nicht abgeleitet werden. Erneut versuchen — deine Fortführungsentscheidung bleibt erhalten."
        );
      }
      setSteps(body.steps);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Die Skalierungsschritte konnten nicht abgeleitet werden. Erneut versuchen — deine Fortführungsentscheidung bleibt erhalten."
      );
    } finally {
      setIsScaling(false);
    }
  }

  function handleStepChanged(updated: StepWithAssumption) {
    setSteps((current) =>
      current.map((step) =>
        step.id === updated.id
          ? { ...step, ...updated, assumption: step.assumption }
          : step
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
        {cockpitButton}
      </div>
    );
  }

  const assumptionGroups: { assumption: StatementData; steps: StepWithAssumption[] }[] =
    [];
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

  const openGroups = assumptionGroups.filter(
    (group) => !isAssumptionPreviouslyValidated(group.steps, feedbacks)
  );
  const completedGroups = assumptionGroups.filter((group) =>
    isAssumptionPreviouslyValidated(group.steps, feedbacks)
  );
  const openValidationSteps = openGroups.flatMap((group) =>
    group.steps.filter((step) => !isStepCompleted(step.id, feedbacks))
  );
  const openValidationIntro = getOpenValidationIntro(
    openValidationSteps,
    feedbacks,
    hasDrafts
  );

  return (
    <div className="flex flex-col gap-6">
      {continuationMode && (
        <section
          aria-label="Fortführungsmodus"
          className="rounded-[10px] border-2 border-accent bg-surface p-4"
        >
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
            <TrendingUp className="h-3.5 w-3.5" aria-hidden />
            Fortführungsmodus: kontrollierte Ausweitung
          </p>
          <p className="mt-2 text-sm text-text">
            Deine Anpassungsentscheidung lautet Fortführen: Der validierte Kern
            der Option bleibt stabil, die Umsetzung wird schrittweise
            ausgeweitet. Die gestützten Annahmen werden dabei im größeren
            Maßstab weiter beobachtet — statt neuer Validierungsexperimente
            entstehen begrenzte Skalierungsschritte mit Monitoring-Metriken.
          </p>
          <ProgressButton
            type="button"
            onClick={handleScale}
            loading={isScaling}
            disabled={isGenerating}
            loadingLabel="Skalierungsschritte werden abgeleitet …"
            className="mt-3"
          >
            <TrendingUp className="h-4 w-4" aria-hidden />
            Skalierungsschritte ableiten
          </ProgressButton>
        </section>
      )}

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
        <ProgressButton
          type="button"
          onClick={handleGenerate}
          loading={isGenerating}
          disabled={isScaling}
          loadingLabel="Schritte werden abgeleitet …"
        >
          <TestTubeDiagonal className="h-4 w-4" aria-hidden />
          {hasSteps
            ? "Umsetzungsschritte erneut ableiten"
            : "Umsetzungsschritte ableiten"}
        </ProgressButton>
      </div>

      {error && <PhaseErrorState message={error} />}

      {isGenerating && <PhaseLoadingState phase={4} variant="step" />}
      {isScaling && (
        <PhaseLoadingState
          phase={4}
          variant="step"
          message="Die KI leitet aus den gestützten Annahmen begrenzte Skalierungsschritte mit Monitoring-Metriken ab …"
        />
      )}

      {hasSteps && !isBusy && (
        <>
          {openGroups.length > 0 && (
            <section aria-label="Offene Validierung" className="flex flex-col gap-6">
              <div>
                <h3 className="font-heading text-base font-medium text-text">
                  Offene Validierung ({openGroups.length})
                </h3>
                <p className="mt-1 text-sm text-text-muted">
                  {openValidationIntro}
                </p>
              </div>
              {openGroups.map((group) => (
                <div key={group.assumption.id} className="flex flex-col gap-3">
                  <AnchorAssumptionHeading
                    evidenceStatus={group.assumption.evidenceStatus}
                  />
                  <StatementCard
                    statement={group.assumption}
                    onChanged={handleAssumptionChanged}
                    validationHistory={validationHistoryMap.get(
                      group.assumption.id
                    )}
                  />
                  <div className="flex flex-col gap-3 border-l-2 border-accent/30 pl-4 md:ml-4">
                    {group.steps
                      // Already assessed steps stay out of the open list —
                      // relevant when scaling steps join a validated assumption.
                      .filter((step) => !isStepCompleted(step.id, feedbacks))
                      .map((step) => (
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

          {completedGroups.length > 0 && (
            <CollapsibleSection
              title={`Bereits geprüft — vorheriger Durchlauf (${completedGroups.length})`}
              intro="Diese Annahmen wurden bereits validiert. Ihre Ergebnisse sind in die Evidenzstatus und deine Anpassungsentscheidung eingeflossen."
              defaultOpen={false}
            >
              <div className="flex flex-col gap-3">
                {completedGroups.map((group) => {
                  const adoptedStep = group.steps.find((step) => step.adopted);
                  const assessedFeedback = adoptedStep
                    ? getAssessedFeedbackForStep(adoptedStep.id, feedbacks)
                    : undefined;
                  if (!adoptedStep || !assessedFeedback) return null;
                  return (
                    <CompletedAssumptionCard
                      key={group.assumption.id}
                      projectId={projectId}
                      assumption={group.assumption}
                      feedback={assessedFeedback}
                      anchorStepId={adoptedStep.id}
                    />
                  );
                })}
              </div>
            </CollapsibleSection>
          )}
        </>
      )}

      {!hasSteps && !isBusy && (
        <PhaseEmptyState>
          In dieser Phase werden die kritischsten Annahmen deiner priorisierten
          Option in begrenzte Umsetzungsschritte mit Messpunkten übersetzt.
          Starte mit „Umsetzungsschritte ableiten“.
        </PhaseEmptyState>
      )}

      {cockpitButton}
    </div>
  );
}
