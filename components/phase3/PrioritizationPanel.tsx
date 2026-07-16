"use client";

import { useState, type ReactNode } from "react";
import { Check, Star } from "lucide-react";
import type { OptionData } from "@/components/phase2/types";
import type { EvaluatedOption, RecommendationData } from "./types";

function PriorityCallout({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[12px] border border-accent bg-accent-soft/55 p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent text-white ring-[3px] ring-white/80 sm:h-16 sm:w-16"
          aria-hidden
        >
          <Star className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={1.75} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            {eyebrow}
          </p>
          <h4 className="mt-1.5 font-heading text-xl font-semibold text-text sm:text-2xl">
            {title}
          </h4>
          {children}
        </div>
      </div>
    </div>
  );
}

export function PrioritizationPanel({
  projectId,
  options,
  recommendation,
  onPrioritized,
}: {
  projectId: string;
  options: EvaluatedOption[];
  recommendation: RecommendationData | null;
  onPrioritized: (options: OptionData[]) => void;
}) {
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideOptionId, setOverrideOptionId] = useState("");
  const [overrideRationale, setOverrideRationale] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prioritized = options.find((option) => option.status === "PRIORITIZED");
  const deferred = options.filter((option) => option.status === "DEFERRED");
  const recommended = recommendation
    ? options.find((option) => option.id === recommendation.optionId)
    : undefined;

  async function prioritize(optionId: string, rationale: string) {
    setIsBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/options", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, optionId, rationale }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          body?.error ??
            "Die Priorisierung konnte nicht gespeichert werden. Erneut versuchen."
        );
      }
      onPrioritized(body.options);
      setOverrideOpen(false);
      setOverrideOptionId("");
      setOverrideRationale("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Die Priorisierung konnte nicht gespeichert werden. Erneut versuchen."
      );
    } finally {
      setIsBusy(false);
    }
  }

  function handleAdoptProposal() {
    if (!recommendation) return;
    // The confirmed rationale keeps the counter-arguments for transparency (NF5).
    prioritize(
      recommendation.optionId,
      `${recommendation.rationale}\n\nWas dagegen sprechen könnte: ${recommendation.counterArguments}`
    );
  }

  function handleConfirmOverride() {
    if (!overrideOptionId || !overrideRationale.trim()) return;
    prioritize(overrideOptionId, overrideRationale.trim());
  }

  const overrideForm = (
    <div className="mt-4 rounded-md border border-accent/25 bg-surface/90 p-3">
      <label className="block text-xs font-medium text-text">
        Option auswählen
        <select
          value={overrideOptionId}
          onChange={(event) => setOverrideOptionId(event.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-surface p-2 text-sm text-text"
        >
          <option value="">Bitte wählen …</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.title}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-3 block text-xs font-medium text-text">
        Eigene Begründung (Pflicht)
        <textarea
          value={overrideRationale}
          onChange={(event) => setOverrideRationale(event.target.value)}
          rows={3}
          placeholder="Warum priorisierst du diese Option?"
          className="mt-1 w-full rounded-md border border-border bg-surface p-2 text-sm text-text"
        />
      </label>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={handleConfirmOverride}
          disabled={isBusy || !overrideOptionId || !overrideRationale.trim()}
          className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
        >
          Priorisierung bestätigen
        </button>
        <button
          type="button"
          onClick={() => setOverrideOpen(false)}
          disabled={isBusy}
          className="rounded-md border border-border px-3 py-1.5 text-xs text-text transition-colors hover:bg-surface"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );

  // A prioritization exists: show the user's decision + deferred options.
  if (prioritized) {
    return (
      <section aria-label="Priorisierung">
        <PriorityCallout
          eyebrow="Priorisierte Option"
          title={prioritized.title}
        >
          {prioritized.prioritizationRationale && (
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-text/80">
              {prioritized.prioritizationRationale}
            </p>
          )}
          {!overrideOpen && (
            <button
              type="button"
              onClick={() => setOverrideOpen(true)}
              disabled={isBusy}
              className="mt-4 rounded-md border border-accent bg-surface/70 px-3.5 py-2 text-xs font-medium text-accent transition-colors hover:bg-surface disabled:opacity-50"
            >
              Andere Option priorisieren
            </button>
          )}
          {overrideOpen && overrideForm}
          {error && <p className="mt-2 text-xs text-danger-text">{error}</p>}
        </PriorityCallout>

        {deferred.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            {deferred.map((option) => (
              <div
                key={option.id}
                className="rounded-[10px] border border-border bg-surface p-4 opacity-60"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                  Zurückgestellt — bleibt verfügbar
                </p>
                <h4 className="mt-1 font-heading text-sm font-medium text-text">
                  {option.title}
                </h4>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  }

  // No decision yet: show the AI proposal (if present) — the user decides.
  return (
    <section aria-label="Priorisierung">
      {recommendation && recommended ? (
        <PriorityCallout
          eyebrow="Priorisierungsvorschlag der KI"
          title={recommended.title}
        >
          <p className="mt-3 text-sm leading-relaxed text-text/80">
            {recommendation.rationale}
          </p>
          <div className="mt-3 rounded-md bg-evidence-question-bg p-3">
            <p className="text-xs font-semibold text-evidence-question-text">
              Was dagegen sprechen könnte
            </p>
            <p className="mt-1 text-sm leading-relaxed text-evidence-question-text">
              {recommendation.counterArguments}
            </p>
          </div>
          <p className="mt-3 text-xs text-text-muted">
            Das ist ein Vorschlag — die Entscheidung triffst du.
          </p>
          {!overrideOpen && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleAdoptProposal}
                disabled={isBusy}
                className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
              >
                <Check className="h-4 w-4" aria-hidden />
                Vorschlag übernehmen
              </button>
              <button
                type="button"
                onClick={() => setOverrideOpen(true)}
                disabled={isBusy}
                className="rounded-md border border-accent bg-surface/70 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-surface disabled:opacity-50"
              >
                Andere Option priorisieren
              </button>
            </div>
          )}
          {overrideOpen && overrideForm}
          {error && <p className="mt-2 text-xs text-danger-text">{error}</p>}
        </PriorityCallout>
      ) : (
        <div className="rounded-[12px] border border-border bg-surface p-5">
          <p className="text-sm text-text-muted">
            Es liegt noch kein aktueller Priorisierungsvorschlag vor. Starte die
            Bewertung (erneut) oder priorisiere direkt eine Option mit eigener
            Begründung.
          </p>
          {!overrideOpen && (
            <button
              type="button"
              onClick={() => setOverrideOpen(true)}
              disabled={isBusy}
              className="mt-3 rounded-md border border-border px-4 py-2 text-sm text-text transition-colors hover:bg-background"
            >
              Option priorisieren
            </button>
          )}
          {overrideOpen && overrideForm}
          {error && <p className="mt-2 text-xs text-danger-text">{error}</p>}
        </div>
      )}
    </section>
  );
}
