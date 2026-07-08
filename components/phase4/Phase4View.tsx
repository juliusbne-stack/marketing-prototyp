"use client";

import { useMemo, useState } from "react";
import { Star, TestTubeDiagonal, TrendingUp } from "lucide-react";
import { ProgressButton } from "@/components/ui/ProgressButton";
import type { FeedbackData } from "@/components/phase5/types";
import type { StatementData } from "@/components/statements/types";
import { CollapsibleSection } from "@/components/wizard/CollapsibleSection";
import { CockpitNavigateButton } from "@/components/wizard/CockpitNavigateButton";
import {
  PhaseEmptyState,
  PhaseErrorState,
  PhaseLoadingState,
} from "@/components/wizard/phaseStates";
import {
  EMPTY_WHITELIST_SCALING,
  EMPTY_WHITELIST_VALIDATION,
  SCALING_MODE_BANNER,
} from "@/lib/labels/phase4";
import type { Phase4Mode } from "@/lib/phase4/types";
import {
  buildValidationHistoryMap,
  getAssessedFeedbackForStep,
  getOpenValidationIntro,
  isAssumptionPreviouslyValidated,
  isStepCompleted,
} from "@/lib/validation";
import { CompletedAssumptionCard } from "./CompletedAssumptionCard";
import { OpenValidationBlock } from "./OpenValidationBlock";
import type {
  Phase4GenerationMeta,
  PrioritizedOptionData,
  StepWithAssumption,
} from "./types";
import { normalizeStepFromApi } from "./types";

export function Phase4View({
  projectId,
  option,
  initialSteps,
  initialFeedbacks,
  phase4Mode,
  initialMeta,
}: {
  projectId: string;
  option: PrioritizedOptionData | null;
  initialSteps: StepWithAssumption[];
  initialFeedbacks: FeedbackData[];
  phase4Mode: Phase4Mode;
  initialMeta?: Phase4GenerationMeta;
}) {
  const [steps, setSteps] = useState(initialSteps);
  const [feedbacks] = useState(initialFeedbacks);
  const [meta, setMeta] = useState<Phase4GenerationMeta>(
    initialMeta ?? { diversityNote: null, modeNote: null, emptyState: null }
  );
  const validationHistoryMap = useMemo(
    () => buildValidationHistoryMap(feedbacks),
    [feedbacks]
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isScaling, setIsScaling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isBusy = isGenerating || isScaling;
  const isScalingMode = phase4Mode === "SCALING";

  const hasSteps = steps.length > 0;
  const hasDrafts = steps.some((step) => !step.adopted && !step.discardedAt);
  const hasAdoptedStep = steps.some(
    (step) => step.adopted && !step.discardedAt
  );

  const cockpitButton = (
    <CockpitNavigateButton
      projectId={projectId}
      enabled={hasAdoptedStep}
      disabledHint="Übernimm zuerst mindestens einen Umsetzungsschritt in den Projektstand — dann startest du die Umsetzung im Cockpit."
    />
  );

  function applyGenerationResponse(body: {
    steps: StepWithAssumption[];
    diversityNote?: string | null;
    modeNote?: string | null;
    emptyState?: string | null;
  }) {
    setSteps(body.steps.map((step) => normalizeStepFromApi(step)));
    setMeta({
      diversityNote: body.diversityNote ?? null,
      modeNote: body.modeNote ?? null,
      emptyState: body.emptyState ?? null,
    });
  }

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
      applyGenerationResponse(body);
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
      applyGenerationResponse(body);
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

  function handleRefinementAdopted({
    step,
    assumption,
    archivedStepId,
  }: {
    step: StepWithAssumption;
    assumption: StatementData;
    archivedStepId: string | null;
  }) {
    setSteps((current) => {
      const withoutArchived = archivedStepId
        ? current.filter((entry) => entry.id !== archivedStepId)
        : current;
      const stepExists = withoutArchived.some((entry) => entry.id === step.id);
      const withUpdatedAssumption = withoutArchived.map((entry) => {
        if (entry.id === step.id) {
          return { ...step, assumption };
        }
        if (entry.assumptionId === assumption.id) {
          return { ...entry, assumption };
        }
        return entry;
      });
      if (stepExists) {
        return withUpdatedAssumption;
      }
      return [...withUpdatedAssumption, { ...step, assumption }];
    });
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
    (group) =>
      !isAssumptionPreviouslyValidated(group.steps, feedbacks) &&
      group.steps.some((step) => !step.discardedAt)
  );
  const completedGroups = assumptionGroups.filter((group) =>
    isAssumptionPreviouslyValidated(group.steps, feedbacks)
  );
  const openValidationSteps = openGroups.flatMap((group) =>
    group.steps.filter(
      (step) => !isStepCompleted(step.id, feedbacks) && !step.discardedAt
    )
  );
  const openValidationIntro = getOpenValidationIntro(
    openValidationSteps,
    feedbacks,
    hasDrafts
  );

  const emptyWhitelistMessage =
    meta.emptyState ??
    (isScalingMode ? EMPTY_WHITELIST_SCALING : EMPTY_WHITELIST_VALIDATION);

  return (
    <div className="flex flex-col gap-6">
      {isScalingMode && (
        <section
          aria-label="Fortführungsmodus"
          className="rounded-[10px] border-2 border-accent bg-surface p-4"
        >
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
            <TrendingUp className="h-3.5 w-3.5" aria-hidden />
            Fortführungsmodus
          </p>
          <p className="mt-2 text-sm text-text">{SCALING_MODE_BANNER}</p>
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

      {!isScalingMode && (
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
      )}

      {error && <PhaseErrorState message={error} />}

      {isGenerating && <PhaseLoadingState phase={4} variant="step" />}
      {isScaling && (
        <PhaseLoadingState
          phase={4}
          variant="step"
          message="Die KI leitet aus den gestützten Fakten begrenzte Skalierungsschritte mit Monitoring-Metriken ab …"
        />
      )}

      {(meta.diversityNote || meta.modeNote) && !isBusy && (
        <div className="flex flex-col gap-2">
          {meta.diversityNote && (
            <p className="rounded-md border border-border bg-background px-3 py-2 text-sm text-text-muted">
              {meta.diversityNote}
            </p>
          )}
          {meta.modeNote && (
            <p className="rounded-md border border-accent/30 bg-accent-soft/30 px-3 py-2 text-sm text-text">
              {meta.modeNote}
            </p>
          )}
        </div>
      )}

      {hasSteps && !isBusy && (
        <>
          {openGroups.length > 0 && (
            <section aria-label="Offene Validierung" className="flex flex-col gap-6">
              <div>
                <h3 className="font-heading text-base font-medium text-text">
                  {isScalingMode
                    ? `Offene Skalierung (${openGroups.length})`
                    : `Offene Validierung (${openGroups.length})`}
                </h3>
                <p className="mt-1 text-sm text-text-muted">
                  {openValidationIntro} Pro Validierung: „Mit KI überarbeiten“ und
                  „Löschen“ findest du rechts neben der Überschrift.
                </p>
              </div>
              {openGroups.map((group) => {
                const activeSteps = group.steps.filter(
                  (step) =>
                    !isStepCompleted(step.id, feedbacks) && !step.discardedAt
                );
                if (activeSteps.length === 0) return null;
                return (
                  <OpenValidationBlock
                    key={group.assumption.id}
                    projectId={projectId}
                    assumption={group.assumption}
                    steps={activeSteps}
                    validationHistory={validationHistoryMap.get(
                      group.assumption.id
                    )}
                    onAssumptionChanged={handleAssumptionChanged}
                    onStepChanged={handleStepChanged}
                    onStepRemoved={handleStepDeleted}
                    onRefinementAdopted={handleRefinementAdopted}
                  />
                );
              })}
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
          {meta.emptyState
            ? emptyWhitelistMessage
            : isScalingMode
              ? "Leite begrenzte Skalierungsschritte für die gestützten Fakte ab — starte mit „Skalierungsschritte ableiten“."
              : "In dieser Phase werden die kritischsten Annahmen deiner priorisierten Option in begrenzte Umsetzungsschritte mit Messpunkten übersetzt. Starte mit „Umsetzungsschritte ableiten“."}
        </PhaseEmptyState>
      )}

      {cockpitButton}
    </div>
  );
}
