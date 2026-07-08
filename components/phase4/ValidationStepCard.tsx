"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Check,
  CircleCheck,
  CircleX,
  ListChecks,
  Pencil,
  Radio,
} from "lucide-react";
import { StepImplementationFrame } from "@/components/steps/StepImplementationFrame";
import { useConfirm } from "@/components/ui/DialogProvider";
import {
  MARKETING_ACTIVITIES_HEADING,
  METHOD_WARNING_ADOPT_CONFIRM,
  SIGNAL_CATEGORY_LABEL,
  stepCopy,
} from "@/lib/labels/phase4";
import { StrategyDimensionChip } from "./StrategyDimensionChip";
import type { StepData } from "./types";

const METRIC_ROLE_LABELS = {
  DECISIVE: "Entscheidend",
  SUPPORTING: "Unterstützend",
} as const;

export function ValidationStepCard({
  step,
  onChanged,
}: {
  step: StepData;
  onChanged: (step: StepData) => void;
}) {
  const confirm = useConfirm();
  const copy = stepCopy(step.stepType);
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(step.title);
  const [draftDescription, setDraftDescription] = useState(step.description);
  const [draftChannel, setDraftChannel] = useState(step.channel ?? "");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function patch(data: Record<string, unknown>) {
    setIsBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/steps", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: step.id, ...data }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(
          body?.error ??
            "Die Änderung konnte nicht gespeichert werden. Erneut versuchen."
        );
      }
      const updated: StepData = await response.json();
      onChanged({ ...step, ...updated });
      return true;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Die Änderung konnte nicht gespeichert werden. Erneut versuchen."
      );
      return false;
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSaveEdit() {
    if (!draftTitle.trim() || !draftDescription.trim()) return;
    const ok = await patch({
      title: draftTitle.trim(),
      description: draftDescription.trim(),
      channel: draftChannel.trim() || null,
    });
    if (ok) setIsEditing(false);
  }

  async function handleAdopt() {
    if (step.methodWarning) {
      const confirmed = await confirm({
        title: "Methodenhinweis beachten",
        message: METHOD_WARNING_ADOPT_CONFIRM,
        confirmLabel: "Trotzdem übernehmen",
        cancelLabel: "Abbrechen",
      });
      if (!confirmed) return;
    }
    await patch({ adopted: true });
  }

  const cardClasses = step.adopted
    ? "border border-border bg-surface"
    : "border border-dashed border-accent/50 bg-accent-soft/40";

  const decisiveMetrics = step.metrics.filter(
    (metric) => metric.metricRole === "DECISIVE"
  );
  const supportingMetrics = step.metrics.filter(
    (metric) => metric.metricRole === "SUPPORTING"
  );

  return (
    <div className="flex flex-col gap-2">
      <div
        className={`rounded-[10px] p-4 transition-colors ${cardClasses} ${
          isBusy ? "opacity-60" : ""
        }`}
      >
        {isEditing ? (
          <div className="flex flex-col gap-2">
            <label className="block text-xs font-medium text-text">
              Titel
              <input
                type="text"
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-surface p-2 text-sm text-text"
              />
            </label>
            <label className="block text-xs font-medium text-text">
              Beschreibung
              <textarea
                value={draftDescription}
                onChange={(event) => setDraftDescription(event.target.value)}
                rows={4}
                className="mt-1 w-full rounded-md border border-border bg-surface p-2 text-sm text-text"
              />
            </label>
            <label className="block text-xs font-medium text-text">
              Kanal (optional)
              <input
                type="text"
                value={draftChannel}
                onChange={(event) => setDraftChannel(event.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-surface p-2 text-sm text-text"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isBusy || !draftTitle.trim() || !draftDescription.trim()}
                className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
              >
                Speichern
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={isBusy}
                className="rounded-md border border-border px-3 py-1 text-xs text-text transition-colors hover:bg-background"
              >
                Abbrechen
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h5 className="font-heading text-sm font-medium text-text">
                    {step.title}
                  </h5>
                  {step.strategyDimension && (
                    <StrategyDimensionChip dimension={step.strategyDimension} />
                  )}
                </div>
                <StepImplementationFrame
                  timeframe={step.timeframe}
                  budgetFrame={step.budgetFrame}
                  onSave={async (data) =>
                    patch({
                      timeframe: data.timeframe,
                      budgetFrame: data.budgetFrame,
                    })
                  }
                />
                <div className="flex flex-wrap items-center gap-1.5">
                  {step.channel && (
                    <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">
                      <Radio className="h-3 w-3" aria-hidden />
                      {step.channel}
                    </span>
                  )}
                  {step.taskProgress && step.taskProgress.total > 0 && (
                    <span
                      title="Aufgabenfortschritt aus dem Umsetzungs-Cockpit"
                      className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-text-muted"
                    >
                      <ListChecks className="h-3 w-3" aria-hidden />
                      Aufgaben {step.taskProgress.done}/{step.taskProgress.total}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDraftTitle(step.title);
                  setDraftDescription(step.description);
                  setDraftChannel(step.channel ?? "");
                  setIsEditing(true);
                }}
                disabled={isBusy}
                aria-label="Umsetzungsschritt bearbeiten"
                title="Bearbeiten"
                className="shrink-0 rounded p-1 text-text-muted transition-colors hover:text-accent disabled:opacity-50"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>

            {step.validationQuestion && (
              <div className="mt-3 rounded-md border border-border/80 bg-background/60 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  {copy.questionHeading}
                </p>
                <p className="mt-1 text-sm text-text">{step.validationQuestion}</p>
              </div>
            )}

            {step.testDesign && (
              <div className="mt-2 rounded-md border border-border/80 bg-background/60 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  {copy.designHeading}
                </p>
                <p className="mt-1 text-sm text-text">{step.testDesign}</p>
              </div>
            )}

            <p className="mt-2 text-sm leading-relaxed text-text-muted">
              {step.description}
            </p>

            {step.marketingActivities && step.marketingActivities.length > 0 && (
              <div className="mt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  {MARKETING_ACTIVITIES_HEADING}
                </p>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {step.marketingActivities.map((activity) => (
                    <li
                      key={activity}
                      className="text-sm text-text before:mr-2 before:text-accent before:content-['•']"
                    >
                      {activity}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {!isEditing && (
          <div className="mt-3 flex flex-col gap-3">
            {decisiveMetrics.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  {copy.signalsHeading}
                </p>
                <div className="mt-1.5 flex flex-col gap-2">
                  {decisiveMetrics.map((metric) => (
                    <MetricBlock
                      key={metric.id}
                      metric={metric}
                      successLabel={copy.successLabel}
                      failureLabel={copy.failureLabel}
                    />
                  ))}
                </div>
              </div>
            )}
            {supportingMetrics.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  Unterstützende Signale
                </p>
                <div className="mt-1.5 flex flex-col gap-2">
                  {supportingMetrics.map((metric) => (
                    <MetricBlock
                      key={metric.id}
                      metric={metric}
                      successLabel={copy.successLabel}
                      failureLabel={copy.failureLabel}
                    />
                  ))}
                </div>
              </div>
            )}
            {decisiveMetrics.length === 0 && supportingMetrics.length === 0 && (
              <div className="flex flex-col gap-2">
                {step.metrics.map((metric) => (
                  <MetricBlock
                    key={metric.id}
                    metric={metric}
                    successLabel={copy.successLabel}
                    failureLabel={copy.failureLabel}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {step.methodWarning && (
          <div
            role="alert"
            className="mt-3 flex gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950"
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>{step.methodWarning}</span>
          </div>
        )}

        {!step.adopted && (
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-accent/20 pt-2.5">
            <span className="text-xs font-medium uppercase tracking-wide text-accent">
              Entwurf
            </span>
            <button
              type="button"
              onClick={() => void handleAdopt()}
              disabled={isBusy}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" aria-hidden />
              In Projektstand übernehmen
            </button>
          </div>
        )}

        {error && <p className="mt-2 text-xs text-danger-text">{error}</p>}
      </div>
    </div>
  );
}

function MetricBlock({
  metric,
  successLabel,
  failureLabel,
}: {
  metric: StepData["metrics"][number];
  successLabel: string;
  failureLabel: string;
}) {
  const roleLabel = METRIC_ROLE_LABELS[metric.metricRole];
  const categoryLabel = metric.signalCategory
    ? SIGNAL_CATEGORY_LABEL[metric.signalCategory]
    : null;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-medium text-text">{metric.name}</p>
        <span className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-text-muted">
          {categoryLabel ? `${roleLabel} · ${categoryLabel}` : roleLabel}
        </span>
      </div>
      <div className="mt-1 grid gap-2 sm:grid-cols-2">
        <div className="rounded-md bg-evidence-fact-bg p-2.5">
          <p className="inline-flex items-start gap-1.5 text-xs leading-relaxed text-evidence-fact-text">
            <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              <span className="font-semibold">{successLabel}:</span>{" "}
              {metric.successCriterion}
            </span>
          </p>
        </div>
        <div className="rounded-md bg-danger-bg p-2.5">
          <p className="inline-flex items-start gap-1.5 text-xs leading-relaxed text-danger-text">
            <CircleX className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              <span className="font-semibold">{failureLabel}:</span>{" "}
              {metric.failureCriterion}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
