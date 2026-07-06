"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { PhaseAdvanceButton } from "@/components/wizard/PhaseAdvanceButton";
import {
  PhaseEmptyState,
  PhaseErrorState,
  PhaseLoadingState,
} from "@/components/wizard/phaseStates";
import { OptionCard } from "./OptionCard";
import type { OptionData } from "./types";

export function Phase2View({
  projectId,
  initialOptions,
  hasAdoptedAnalysis,
}: {
  projectId: string;
  initialOptions: OptionData[];
  hasAdoptedAnalysis: boolean;
}) {
  const [options, setOptions] = useState(initialOptions);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasOptions = options.length > 0;
  const hasDrafts = options.some((option) => option.status === "DRAFT");
  // Adopted options in the broad sense: everything past DRAFT that is still
  // available for evaluation in phase 3 (mirrors the phase 3 page query).
  const adoptedOptionCount = options.filter((option) =>
    ["ADOPTED", "PRIORITIZED", "DEFERRED"].includes(option.status)
  ).length;

  const advanceButton = (
    <PhaseAdvanceButton
      projectId={projectId}
      nextPhase={3}
      enabled={adoptedOptionCount >= 2}
      disabledHint="Übernimm zuerst mindestens zwei Optionen in den Projektstand."
    />
  );

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          body?.error ??
            "Die KI-Antwort konnte nicht verarbeitet werden. Erneut versuchen — dein Analysebild bleibt erhalten."
        );
      }
      setOptions(body.options);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Die KI-Antwort konnte nicht verarbeitet werden. Erneut versuchen — dein Analysebild bleibt erhalten."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  function handleChanged(updated: OptionData) {
    setOptions((current) =>
      current.map((option) => (option.id === updated.id ? updated : option))
    );
  }

  if (!hasAdoptedAnalysis) {
    return (
      <div className="flex flex-col gap-6">
        <PhaseEmptyState>
          In dieser Phase entstehen aus deinem Analysebild 2–3 vergleichbare
          Strategieoptionen. Übernimm zuerst in Phase 1 Aussagen in den
          Projektstand.
        </PhaseEmptyState>
        {advanceButton}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-border bg-surface px-4 py-3">
        <p className="text-sm text-text-muted">
          {hasOptions
            ? "Neu entwickeln ersetzt nur Entwürfe — übernommene Optionen bleiben erhalten."
            : "Aus den übernommenen Aussagen deines Analysebilds entstehen 2–3 abgegrenzte Strategieoptionen."}
        </p>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          {isGenerating
            ? "Optionen werden entwickelt …"
            : hasOptions
              ? "Optionen neu entwickeln"
              : "Optionen entwickeln"}
        </button>
      </div>

      {error && <PhaseErrorState message={error} />}

      {isGenerating && <PhaseLoadingState phase={2} variant="option" />}

      {hasOptions && !isGenerating && (
        <>
          {hasDrafts && (
            <p className="text-sm text-text-muted">
              Prüfe die Entwürfe, passe Dimensionen bei Bedarf an und übernimm
              die Optionen einzeln in den Projektstand — erst dann stehen sie
              in Phase 3 zur Bewertung bereit.
            </p>
          )}
          <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
            {options.map((option) => (
              <OptionCard
                key={option.id}
                option={option}
                onChanged={handleChanged}
              />
            ))}
          </div>
        </>
      )}

      {!hasOptions && !isGenerating && (
        <PhaseEmptyState>
          In dieser Phase entstehen aus deinem Analysebild 2–3 vergleichbare
          Strategieoptionen. Starte mit „Optionen entwickeln“.
        </PhaseEmptyState>
      )}

      {advanceButton}
    </div>
  );
}
