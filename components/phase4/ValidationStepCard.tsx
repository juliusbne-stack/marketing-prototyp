"use client";

import { useState } from "react";
import {
  Check,
  CircleCheck,
  CircleX,
  ListChecks,
  Pencil,
  Radio,
  Sparkles,
  Trash2,
} from "lucide-react";
import { RefinementPanel } from "./RefinementPanel";
import { StepImplementationFrame } from "@/components/steps/StepImplementationFrame";
import type { StepData } from "./types";

// Validation step card (UI_KONZEPT §4, phase 4): title, description, channel
// chip and metrics as a two-column supported/refuted layout. Draft/adoption
// styling mirrors the StatementCard (F10/NF5).
export function ValidationStepCard({
  step,
  onChanged,
  onDeleted,
}: {
  step: StepData;
  onChanged: (step: StepData) => void;
  onDeleted: (id: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isRefinementOpen, setIsRefinementOpen] = useState(false);
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
      const updated: Omit<StepData, never> = await response.json();
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

  async function handleDelete() {
    setIsBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/steps?id=${encodeURIComponent(step.id)}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        throw new Error(
          "Der Umsetzungsschritt konnte nicht gelöscht werden. Erneut versuchen."
        );
      }
      onDeleted(step.id);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Der Umsetzungsschritt konnte nicht gelöscht werden. Erneut versuchen."
      );
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

  const cardClasses = step.adopted
    ? "border border-border bg-surface"
    : "border border-dashed border-accent/50 bg-accent-soft/40";

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
                <h5 className="font-heading text-sm font-medium text-text">
                  {step.title}
                </h5>
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
                  {/* Subtle cockpit progress chip ("Aufgaben 3/6") */}
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
              <div className="flex shrink-0 items-center gap-2">
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
                  className="rounded p-1 text-text-muted transition-colors hover:text-accent disabled:opacity-50"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                </button>
                {!step.adopted && (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsRefinementOpen((open) => !open)}
                      disabled={isBusy}
                      aria-label="Mit KI verfeinern"
                      aria-expanded={isRefinementOpen}
                      title="Mit KI verfeinern"
                      className={`rounded p-1 transition-colors hover:text-accent disabled:opacity-50 ${
                        isRefinementOpen ? "text-accent" : "text-text-muted"
                      }`}
                    >
                      <Sparkles className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isBusy}
                      aria-label="Umsetzungsschritt löschen"
                      className="rounded p-1 text-text-muted transition-colors hover:text-danger-text disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </>
                )}
              </div>
            </div>

            <p className="mt-2 text-sm leading-relaxed text-text">
              {step.description}
            </p>
          </>
        )}

        <div className="mt-3 flex flex-col gap-2">
          {step.metrics.map((metric) => (
            <div key={metric.id}>
              <p className="text-xs font-medium text-text">{metric.name}</p>
              <div className="mt-1 grid gap-2 sm:grid-cols-2">
                <div className="rounded-md bg-evidence-fact-bg p-2.5">
                  <p className="inline-flex items-start gap-1.5 text-xs leading-relaxed text-evidence-fact-text">
                    <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span>
                      <span className="font-semibold">Stützend wenn:</span>{" "}
                      {metric.successCriterion}
                    </span>
                  </p>
                </div>
                <div className="rounded-md bg-danger-bg p-2.5">
                  <p className="inline-flex items-start gap-1.5 text-xs leading-relaxed text-danger-text">
                    <CircleX className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span>
                      <span className="font-semibold">Widerlegend wenn:</span>{" "}
                      {metric.failureCriterion}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {!step.adopted && (
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-accent/20 pt-2.5">
            <span className="text-xs font-medium uppercase tracking-wide text-accent">
              Entwurf
            </span>
            <button
              type="button"
              onClick={() => patch({ adopted: true })}
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

      {!step.adopted && isRefinementOpen && (
        <RefinementPanel
          step={step}
          onAdopted={onChanged}
          onClose={() => setIsRefinementOpen(false)}
        />
      )}
    </div>
  );
}
