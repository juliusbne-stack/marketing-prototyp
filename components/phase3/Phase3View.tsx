"use client";

import { useState } from "react";
import { Scale } from "lucide-react";
import type { OptionData } from "@/components/phase2/types";
import { PhaseAdvanceButton } from "@/components/wizard/PhaseAdvanceButton";
import { EvaluationMatrix } from "./EvaluationMatrix";
import { PrioritizationPanel } from "./PrioritizationPanel";
import type {
  EvaluatedOption,
  EvaluationData,
  RecommendationData,
} from "./types";

export function Phase3View({
  projectId,
  initialOptions,
  initialEvaluations,
}: {
  projectId: string;
  initialOptions: EvaluatedOption[];
  initialEvaluations: EvaluationData[];
}) {
  const [options, setOptions] = useState(initialOptions);
  const [evaluations, setEvaluations] = useState(initialEvaluations);
  // The AI proposal lives in client state only — it is never a decision.
  const [recommendation, setRecommendation] =
    useState<RecommendationData | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasEvaluations = evaluations.length > 0;
  const hasPrioritized = options.some(
    (option) => option.status === "PRIORITIZED"
  );

  const advanceButton = (
    <PhaseAdvanceButton
      projectId={projectId}
      nextPhase={4}
      enabled={hasPrioritized}
      disabledHint="Priorisiere zuerst eine Option mit Begründung."
    />
  );

  async function handleEvaluate() {
    setIsEvaluating(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          body?.error ??
            "Die KI-Antwort konnte nicht verarbeitet werden. Erneut versuchen — deine Optionen bleiben erhalten."
        );
      }
      setEvaluations(body.evaluations);
      setRecommendation(body.recommendation);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Die KI-Antwort konnte nicht verarbeitet werden. Erneut versuchen — deine Optionen bleiben erhalten."
      );
    } finally {
      setIsEvaluating(false);
    }
  }

  function handlePrioritized(updated: OptionData[]) {
    setOptions(
      updated
        .filter((option) => option.status !== "DRAFT")
        .map((option) => ({
          id: option.id,
          title: option.title,
          summary: option.summary,
          status: option.status,
          prioritizationRationale: option.prioritizationRationale,
        }))
    );
  }

  if (options.length < 2) {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-[10px] border border-dashed border-border bg-surface p-8 text-center text-sm text-text-muted">
          In dieser Phase vergleichst du die Strategieoptionen anhand von
          sechs Kriterien und priorisierst begründet eine davon. Übernimm
          zuerst in Phase 2 mindestens zwei Optionen in den Projektstand.
        </div>
        {advanceButton}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-border bg-surface px-4 py-3">
        <p className="text-sm text-text-muted">
          {hasEvaluations
            ? "Erneutes Starten ersetzt die bisherigen Scores und erzeugt einen neuen Vorschlag."
            : `${options.length} übernommene Optionen werden anhand der sechs Kriterien verglichen.`}
        </p>
        <button
          type="button"
          onClick={handleEvaluate}
          disabled={isEvaluating}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
        >
          <Scale className="h-4 w-4" aria-hidden />
          {isEvaluating
            ? "Bewertung läuft …"
            : hasEvaluations
              ? "Bewertung erneut starten"
              : "Bewertung starten"}
        </button>
      </div>

      {error && (
        <div className="rounded-[10px] border border-danger-text/30 bg-danger-bg p-4 text-sm text-danger-text">
          {error}
        </div>
      )}

      {isEvaluating && (
        <div aria-live="polite" className="flex flex-col gap-3">
          <p className="text-sm text-text-muted">
            Die KI vergleicht die Optionen anhand der sechs Kriterien …
          </p>
          <div className="h-64 animate-pulse rounded-[10px] border border-border bg-surface">
            <div className="m-4 h-3 w-1/3 rounded bg-border" />
            <div className="mx-4 h-3 w-3/4 rounded bg-border/60" />
            <div className="m-4 h-40 rounded bg-border/40" />
          </div>
        </div>
      )}

      {hasEvaluations && !isEvaluating && (
        <>
          <EvaluationMatrix options={options} evaluations={evaluations} />
          <PrioritizationPanel
            projectId={projectId}
            options={options}
            recommendation={recommendation}
            onPrioritized={handlePrioritized}
          />
        </>
      )}

      {!hasEvaluations && !isEvaluating && (
        <div className="rounded-[10px] border border-dashed border-border bg-surface p-8 text-center text-sm text-text-muted">
          In dieser Phase vergleichst du deine Strategieoptionen anhand von
          sechs Kriterien. Starte mit „Bewertung starten“ — die Priorisierung
          entscheidest anschließend du.
        </div>
      )}

      {advanceButton}
    </div>
  );
}
