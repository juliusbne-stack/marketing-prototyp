"use client";

import { useState } from "react";
import {
  Check,
  CircleCheck,
  CircleX,
  LoaderCircle,
  Radio,
  Sparkles,
} from "lucide-react";
import type { Phase4RefineResponse } from "@/lib/schemas/phase4Refine";
import { StepImplementationFrame } from "@/components/steps/StepImplementationFrame";
import type { StepData } from "./types";

// One completed refinement round — kept ONLY in client state (deliberately
// not persisted) and sent along so the AI keeps respecting earlier feedback.
type RefinementRound = {
  feedback: string;
  resultTitle: string;
};

const QUICK_CHIPS = [
  "Anderer Kanal",
  "Weniger Aufwand/günstiger",
  "Schneller umsetzbar",
  "Keine Interviews",
  "Ambitionierter",
] as const;

// Dialogic refinement panel for a draft validation step: informal feedback
// in, a structured revised draft out — previewed before it replaces anything.
export function RefinementPanel({
  step,
  onAdopted,
  onClose,
}: {
  step: StepData;
  onAdopted: (step: StepData) => void;
  onClose: () => void;
}) {
  const [feedback, setFeedback] = useState("");
  const [rounds, setRounds] = useState<RefinementRound[]>([]);
  const [proposal, setProposal] = useState<Phase4RefineResponse | null>(null);
  const [lastFeedback, setLastFeedback] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [isAdopting, setIsAdopting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const response = await fetch("/api/ai/4/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stepId: step.id,
          feedback: feedback.trim(),
          previousRounds: rounds,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          body?.error ??
            "Die KI-Antwort konnte nicht verarbeitet werden. Erneut versuchen — der bisherige Entwurf bleibt erhalten."
        );
      }
      setProposal(body.proposal);
      setLastFeedback(feedback.trim());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Die KI-Antwort konnte nicht verarbeitet werden. Erneut versuchen — der bisherige Entwurf bleibt erhalten."
      );
    } finally {
      setIsRefining(false);
    }
  }

  async function handleAdopt() {
    if (!proposal) return;
    setIsAdopting(true);
    setError(null);
    try {
      const response = await fetch("/api/steps", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: step.id,
          title: proposal.title,
          description: proposal.description,
          channel: proposal.channel ?? null,
          timeframe: proposal.timeframe,
          budgetFrame: proposal.budgetFrame,
          metrics: proposal.metrics,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          body?.error ??
            "Die Änderung konnte nicht gespeichert werden. Erneut versuchen."
        );
      }
      // The step stays a draft (adopted=false) — only its content changes.
      onAdopted({ ...step, ...body });
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
      { feedback: lastFeedback, resultTitle: proposal.title },
    ]);
    setProposal(null);
    setFeedback("");
  }

  return (
    <div className="rounded-[10px] border border-accent/40 bg-accent-soft/30 p-4">
      <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        Mit KI verfeinern
      </p>

      {isRefining ? (
        <div aria-live="polite" aria-busy="true" className="mt-3">
          <p className="inline-flex items-center gap-2 text-sm text-text-muted">
            <LoaderCircle className="h-4 w-4 animate-spin text-accent" aria-hidden />
            Die KI überarbeitet den Umsetzungsschritt gemäß deinem Feedback …
          </p>
          <div className="mt-3 h-28 animate-pulse rounded-[10px] border border-border bg-surface">
            <div className="m-4 h-3 w-1/3 rounded bg-border" />
            <div className="mx-4 h-3 w-3/4 rounded bg-border/60" />
            <div className="m-4 h-8 rounded bg-border/40" />
          </div>
        </div>
      ) : proposal ? (
        <div className="mt-3 flex flex-col gap-3">
          <div className="rounded-[10px] border border-dashed border-accent/50 bg-surface p-4">
            <div>
              <h5 className="font-heading text-sm font-medium text-text">
                {proposal.title}
              </h5>
              <StepImplementationFrame
                timeframe={proposal.timeframe}
                budgetFrame={proposal.budgetFrame}
                readOnly
              />
              {proposal.channel && (
                <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">
                  <Radio className="h-3 w-3" aria-hidden />
                  {proposal.channel}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-text">
              {proposal.description}
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {proposal.metrics.map((metric, index) => (
                <div key={index}>
                  <p className="text-xs font-medium text-text">{metric.name}</p>
                  <div className="mt-1 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-md bg-evidence-fact-bg p-2.5">
                      <p className="inline-flex items-start gap-1.5 text-xs leading-relaxed text-evidence-fact-text">
                        <CircleCheck
                          className="mt-0.5 h-3.5 w-3.5 shrink-0"
                          aria-hidden
                        />
                        <span>
                          <span className="font-semibold">Stützend wenn:</span>{" "}
                          {metric.successCriterion}
                        </span>
                      </p>
                    </div>
                    <div className="rounded-md bg-danger-bg p-2.5">
                      <p className="inline-flex items-start gap-1.5 text-xs leading-relaxed text-danger-text">
                        <CircleX
                          className="mt-0.5 h-3.5 w-3.5 shrink-0"
                          aria-hidden
                        />
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
            <p className="mt-3 rounded-md bg-accent-soft p-2.5 text-xs leading-relaxed text-accent">
              <span className="font-semibold">Änderung:</span>{" "}
              {proposal.changeSummary}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleAdopt}
              disabled={isAdopting}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
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
              onClick={onClose}
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
              placeholder="Formloses Feedback, z. B. „Der Kanal passt nicht, wir haben kein Instagram-Know-how.“"
              className="mt-1 w-full rounded-md border border-border bg-surface p-2 text-sm text-text"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleRefine}
              disabled={!feedback.trim()}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
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
