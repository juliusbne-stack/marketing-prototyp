"use client";

import { useState } from "react";
import { Gauge, MessageSquareText, Radio } from "lucide-react";
import type { StepWithAssumption } from "@/components/phase4/types";
import type { FeedbackData } from "./types";

// One feedback form per adopted validation step (UI_KONZEPT §4, phase 5).
export function FeedbackForm({
  projectId,
  step,
  feedback,
  kpiSummary = null,
  onSaved,
}: {
  projectId: string;
  step: StepWithAssumption;
  feedback: FeedbackData | null;
  // LLM-free summary of the cockpit KPI data (null = no data points yet).
  kpiSummary?: string | null;
  onSaved: (feedback: FeedbackData) => void;
}) {
  const [isEditing, setIsEditing] = useState(feedback === null);
  const [draft, setDraft] = useState(feedback?.content ?? "");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const content = draft.trim();
    if (!content) return;
    setIsBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/feedback", {
        method: feedback ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          feedback
            ? { id: feedback.id, content }
            : { projectId, stepId: step.id, content }
        ),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          body?.error ??
            "Die Rückmeldung konnte nicht gespeichert werden. Erneut versuchen."
        );
      }
      // PATCH responses wrap the feedback ({ feedback, statement }).
      onSaved(feedback ? body.feedback : body);
      setIsEditing(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Die Rückmeldung konnte nicht gespeichert werden. Erneut versuchen."
      );
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div
      id={`step-feedback-${step.id}`}
      className="scroll-mt-6 rounded-[10px] border border-border bg-surface p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="font-heading text-sm font-medium text-text">
          {step.title}
        </h4>
        {step.channel && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">
            <Radio className="h-3 w-3" aria-hidden />
            {step.channel}
          </span>
        )}
      </div>
      <p className="mt-1 text-[13px] text-text-muted">
        Geprüfte Annahme: {step.assumption.content}
      </p>
      <ul className="mt-2 flex flex-col gap-0.5 text-[13px] text-text-muted">
        {step.metrics.map((metric) => (
          <li key={metric.id}>
            <span className="font-medium">{metric.name}:</span> stützend wenn{" "}
            {metric.successCriterion} — widerlegend wenn{" "}
            {metric.failureCriterion}
          </li>
        ))}
      </ul>

      {isEditing ? (
        <div className="mt-3">
          <label className="block text-xs font-medium text-text">
            Was ist passiert? (fiktive Rückmeldung eintragen)
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={3}
              placeholder="z. B. Ergebnisse der Interviews, Zahlen aus dem Kanaltest …"
              className="mt-1 w-full rounded-md border border-border bg-surface p-2 text-sm text-text"
            />
          </label>
          {kpiSummary && (
            <button
              type="button"
              onClick={() => setDraft(kpiSummary)}
              disabled={isBusy}
              className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline disabled:opacity-50"
            >
              <Gauge className="h-3.5 w-3.5" aria-hidden />
              Kennzahlen aus dem Cockpit übernehmen
            </button>
          )}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isBusy || !draft.trim()}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
            >
              <MessageSquareText className="h-3.5 w-3.5" aria-hidden />
              Rückmeldung speichern
            </button>
            {feedback && (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setDraft(feedback.content);
                }}
                disabled={isBusy}
                className="rounded-md border border-border px-3 py-1.5 text-xs text-text transition-colors hover:bg-background"
              >
                Abbrechen
              </button>
            )}
          </div>
        </div>
      ) : (
        feedback && (
          <div className="mt-3 rounded-md bg-background p-3">
            <p className="text-xs font-semibold text-text-muted">
              Erfasste Rückmeldung
            </p>
            <p className="mt-1 whitespace-pre-line text-sm text-text">
              {feedback.content}
            </p>
            <button
              type="button"
              onClick={() => {
                setDraft(feedback.content);
                setIsEditing(true);
              }}
              disabled={isBusy}
              className="mt-2 text-xs font-medium text-accent hover:underline"
            >
              Bearbeiten
            </button>
          </div>
        )
      )}

      {error && <p className="mt-2 text-xs text-danger-text">{error}</p>}
    </div>
  );
}
