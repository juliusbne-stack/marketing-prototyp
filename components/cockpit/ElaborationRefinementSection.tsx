"use client";

import { useEffect, useState } from "react";
import { Check, LoaderCircle, Sparkles } from "lucide-react";
import type { TaskElaborationResponse } from "@/lib/schemas/taskElaboration";
import type { TaskElaborationRefineResponse } from "@/lib/schemas/taskElaborationRefine";
import { ElaborationContent } from "./ElaborationContent";
import type { StatementRef } from "./types";

type RefinementRound = {
  feedback: string;
  changeSummary: string;
};

const QUICK_CHIPS = [
  "Weniger Aufwand",
  "Anderes Vorgehen",
  "Konkreter",
  "Anderer Kanal/Tool",
  "Ambitionierter",
] as const;

// Feedback-based revision of a task elaboration — preview before adopt (client-only history).
export function ElaborationRefinementSection({
  taskId,
  currentContent,
  statementMap,
  initialFeedback,
  onAdopted,
  onClose,
}: {
  taskId: string;
  currentContent: TaskElaborationResponse;
  statementMap: Map<string, StatementRef>;
  initialFeedback?: string;
  onAdopted: (elaboration: TaskElaborationResponse) => void;
  onClose: () => void;
}) {
  const [feedback, setFeedback] = useState(initialFeedback ?? "");
  const [rounds, setRounds] = useState<RefinementRound[]>([]);
  const [proposal, setProposal] = useState<TaskElaborationRefineResponse | null>(
    null
  );
  const [lastFeedback, setLastFeedback] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [isAdopting, setIsAdopting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialFeedback !== undefined) {
      setFeedback(initialFeedback);
    }
  }, [initialFeedback]);

  function appendChip(chip: string) {
    setFeedback((current) => {
      const trimmed = current.trim();
      if (!trimmed) return chip;
      return `${trimmed.replace(/[.;]$/, "")}; ${chip}`;
    });
  }

  async function handleRefine() {
    if (!feedback.trim()) return;
    setIsRefining(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/implementation/tasks/${taskId}/elaborate/refine`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            feedback: feedback.trim(),
            previousRounds: rounds,
          }),
        }
      );
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          body?.error ??
            "Die KI-Antwort konnte nicht verarbeitet werden. Erneut versuchen — die bisherige Ausarbeitung bleibt erhalten."
        );
      }
      setProposal(body.proposal);
      setLastFeedback(feedback.trim());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Die KI-Antwort konnte nicht verarbeitet werden. Erneut versuchen — die bisherige Ausarbeitung bleibt erhalten."
      );
    } finally {
      setIsRefining(false);
    }
  }

  async function handleAdopt() {
    if (!proposal) return;
    setIsAdopting(true);
    setError(null);
    const { changeSummary: _changeSummary, ...elaboration } = proposal;
    try {
      const response = await fetch(
        `/api/implementation/tasks/${taskId}/elaborate`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ elaboration }),
        }
      );
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          body?.error ??
            "Die Änderung konnte nicht gespeichert werden. Erneut versuchen."
        );
      }
      onAdopted(body.elaboration ?? elaboration);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Die Änderung konnte nicht gespeichert werden. Erneut versuchen."
      );
      setIsAdopting(false);
    }
  }

  function handleContinue() {
    if (!proposal) return;
    setRounds((current) => [
      ...current,
      { feedback: lastFeedback, changeSummary: proposal.changeSummary },
    ]);
    setProposal(null);
    setFeedback("");
  }

  function handleDiscard() {
    setProposal(null);
    onClose();
  }

  const previewContent: TaskElaborationResponse | null = proposal
    ? (() => {
        const { changeSummary: _changeSummary, ...rest } = proposal;
        return rest;
      })()
    : null;

  return (
    <div className="mt-4 rounded-[10px] border border-accent/40 bg-accent-soft/30 p-4">
      <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        Mit Feedback überarbeiten
      </p>

      {isRefining ? (
        <div aria-live="polite" aria-busy="true" className="mt-3">
          <p className="inline-flex items-center gap-2 text-sm text-text-muted">
            <LoaderCircle className="h-4 w-4 animate-spin text-accent" aria-hidden />
            Die KI überarbeitet das Arbeitspaket gemäß deinem Feedback …
          </p>
          <div className="mt-3 h-28 animate-pulse rounded-[10px] border border-border bg-surface">
            <div className="m-4 h-3 w-1/3 rounded bg-border" />
            <div className="mx-4 h-3 w-3/4 rounded bg-border/60" />
            <div className="m-4 h-8 rounded bg-border/40" />
          </div>
        </div>
      ) : proposal && previewContent ? (
        <div className="mt-3 flex flex-col gap-3">
          <div className="rounded-[10px] border border-dashed border-accent/50 bg-surface p-4">
            <p className="mb-3 rounded-md bg-accent-soft p-2.5 text-xs leading-relaxed text-accent-deep">
              <span className="font-semibold">Änderung:</span>{" "}
              {proposal.changeSummary}
            </p>
            <ElaborationContent
              content={previewContent}
              statementMap={statementMap}
              showFormulierungsvorschlaege
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleAdopt}
              disabled={isAdopting}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-bright active:bg-brand-dark disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" aria-hidden />
              So übernehmen
            </button>
            <button
              type="button"
              onClick={handleContinue}
              disabled={isAdopting}
              className="inline-flex items-center gap-1.5 rounded-md border border-accent px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent-soft disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Weiter verfeinern
            </button>
            <button
              type="button"
              onClick={handleDiscard}
              disabled={isAdopting}
              className="rounded-md border border-border px-3 py-1.5 text-xs text-text transition-colors hover:bg-background disabled:opacity-50"
            >
              Verwerfen
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {rounds.length > 0 && (
            <p className="text-xs text-text-muted">
              Bisherige Verfeinerungsrunden ({rounds.length}) werden bei der
              nächsten Überarbeitung weiter berücksichtigt.
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => appendChip(chip)}
                className="rounded-full border border-accent/40 bg-surface px-2.5 py-0.5 text-xs text-accent transition-colors hover:bg-accent-soft"
              >
                {chip}
              </button>
            ))}
          </div>
          <label className="block text-xs font-medium text-text">
            Was soll anders sein?
            <textarea
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              rows={3}
              placeholder="Formloses Feedback, z. B. „Schritt 2 ist zu aufwendig — wir haben kein Video-Equipment.“"
              className="mt-1 w-full rounded-md border border-border bg-surface p-2 text-sm text-text"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleRefine}
              disabled={!feedback.trim()}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-bright active:bg-brand-dark disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Vorschlag überarbeiten
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-3 py-1.5 text-xs text-text transition-colors hover:bg-background"
            >
              Verwerfen
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs text-danger-text">
          {error}
        </p>
      )}
    </div>
  );
}
