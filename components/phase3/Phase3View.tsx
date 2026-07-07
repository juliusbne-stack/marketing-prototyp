"use client";

import { useState } from "react";
import { Scale } from "lucide-react";
import { ProgressButton } from "@/components/ui/ProgressButton";
import type { OptionData } from "@/components/phase2/types";
import { PhaseAdvanceButton } from "@/components/wizard/PhaseAdvanceButton";
import {
  PhaseEmptyState,
  PhaseErrorState,
  PhaseLoadingState,
} from "@/components/wizard/phaseStates";
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
        <PhaseEmptyState>
          In dieser Phase vergleichst du die Strategieoptionen anhand von
          sechs Kriterien und priorisierst begründet eine davon. Übernimm
          zuerst in Phase 2 mindestens zwei Optionen in den Projektstand.
        </PhaseEmptyState>
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
        <ProgressButton
          type="button"
          onClick={handleEvaluate}
          loading={isEvaluating}
          loadingLabel="Bewertung läuft …"
        >
          <Scale className="h-4 w-4" aria-hidden />
          {hasEvaluations ? "Bewertung erneut starten" : "Bewertung starten"}
        </ProgressButton>
      </div>

      {error && <PhaseErrorState message={error} />}

      {isEvaluating && <PhaseLoadingState phase={3} variant="matrix" />}

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
        <PhaseEmptyState>
          In dieser Phase vergleichst du deine Strategieoptionen anhand von
          sechs Kriterien. Starte mit „Bewertung starten“ — die Priorisierung
          entscheidest anschließend du.
        </PhaseEmptyState>
      )}

      {advanceButton}
    </div>
  );
}
