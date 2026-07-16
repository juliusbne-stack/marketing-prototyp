"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Pencil, Sparkles } from "lucide-react";
import { ProgressButton } from "@/components/ui/ProgressButton";
import { PhaseAdvanceButton } from "@/components/wizard/PhaseAdvanceButton";
import {
  PhaseEmptyState,
  PhaseErrorState,
  PhaseLoadingState,
} from "@/components/wizard/phaseStates";
import type { StatementData } from "@/components/statements/types";
import { OptionCard } from "./OptionCard";
import type { OptionData, UnchangedDimension } from "./types";
import { PhaseInputSection } from "@/components/phaseInput/PhaseInputSection";
import type { PhaseInputState } from "@/lib/phaseInput";

export function Phase2View({
  projectId,
  initialOptions,
  hasAdoptedAnalysis,
  initialPhaseInputs,
  revisionMode = false,
  initialRevisions = [],
  initialHasAdoptedRevision = false,
}: {
  projectId: string;
  initialOptions: OptionData[];
  hasAdoptedAnalysis: boolean;
  initialPhaseInputs?: PhaseInputState;
  /** Active after an ADAPT decision in phase 5 while an option is prioritized. */
  revisionMode?: boolean;
  initialRevisions?: StatementData[];
  initialHasAdoptedRevision?: boolean;
}) {
  const [options, setOptions] = useState(initialOptions);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generateKey, setGenerateKey] = useState("initial");

  // Revision mode state. The "unchanged" reasons come from the AI response and
  // are held in client state only (prototype simplification, not persisted).
  const [revisions, setRevisions] = useState(initialRevisions);
  const [unchangedDimensions, setUnchangedDimensions] = useState<
    UnchangedDimension[]
  >([]);
  const [isRevising, setIsRevising] = useState(false);
  const [revisionError, setRevisionError] = useState<string | null>(null);
  const [hasAdoptedRevision, setHasAdoptedRevision] = useState(
    initialHasAdoptedRevision
  );

  const prioritizedOption = options.find(
    (option) => option.status === "PRIORITIZED"
  );
  const showRevisionMode = revisionMode && Boolean(prioritizedOption);

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
      setGenerateKey(String(Date.now()));
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

  async function handleRevise() {
    setIsRevising(true);
    setRevisionError(null);
    try {
      const response = await fetch("/api/ai/2/revise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          body?.error ??
            "Der Überarbeitungsvorschlag konnte nicht erstellt werden. Erneut versuchen — deine Option bleibt unverändert."
        );
      }
      setRevisions(body.revisions);
      setUnchangedDimensions(body.unchanged);
    } catch (err) {
      setRevisionError(
        err instanceof Error
          ? err.message
          : "Der Überarbeitungsvorschlag konnte nicht erstellt werden. Erneut versuchen — deine Option bleibt unverändert."
      );
    } finally {
      setIsRevising(false);
    }
  }

  function handleRevisionAdopted(updated: OptionData, revisionId: string) {
    handleChanged(updated);
    setRevisions((current) =>
      current.filter((revision) => revision.id !== revisionId)
    );
    setHasAdoptedRevision(true);
  }

  function handleRevisionDiscarded(revisionId: string) {
    setRevisions((current) =>
      current.filter((revision) => revision.id !== revisionId)
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
      {showRevisionMode && (
        <section
          aria-label="Überarbeitungsmodus"
          className="rounded-[10px] border-2 border-accent bg-surface p-4"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            Überarbeitungsmodus
          </p>
          <p className="mt-2 text-sm text-text">
            Du hast entschieden, diese Option auf Basis deiner Lernergebnisse
            anzupassen. Grundlage sind die aktualisierten Evidenzstatus und die
            Erkenntnisse aus Phase 5.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <ProgressButton
              type="button"
              onClick={handleRevise}
              loading={isRevising}
              loadingLabel="Überarbeitungsvorschlag wird erstellt …"
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              Überarbeitungsvorschlag erstellen
            </ProgressButton>
            <p className="inline-flex items-center gap-1 text-xs text-text-muted">
              <Pencil className="h-3 w-3" aria-hidden />
              Du kannst die Dimensionen auch manuell über das Stift-Symbol
              bearbeiten.
            </p>
          </div>
          {revisionError && (
            <p className="mt-2 text-xs text-danger-text">{revisionError}</p>
          )}
        </section>
      )}

      {!showRevisionMode && (
        <PhaseInputSection
          projectId={projectId}
          phase={2}
          initialState={initialPhaseInputs}
          onInputsChange={() => setGenerateKey(String(Date.now()))}
        />
      )}

      <div
        key={generateKey}
        className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-border bg-surface px-4 py-3"
      >
        <p className="text-sm text-text-muted">
          {hasOptions
            ? "Neu entwickeln ersetzt nur Entwürfe — übernommene Optionen bleiben erhalten."
            : "Aus den übernommenen Aussagen deines Analysebilds entstehen 2–3 abgegrenzte Strategieoptionen."}
        </p>
        <ProgressButton
          type="button"
          onClick={handleGenerate}
          loading={isGenerating}
          loadingLabel="Optionen werden entwickelt …"
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          {hasOptions ? "Optionen neu entwickeln" : "Optionen entwickeln"}
        </ProgressButton>
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
            {options.map((option, index) => {
              const isRevisionTarget =
                showRevisionMode && option.status === "PRIORITIZED";
              return (
                <OptionCard
                  key={option.id}
                  option={option}
                  toneIndex={index}
                  onChanged={handleChanged}
                  revisions={isRevisionTarget ? revisions : []}
                  unchangedDimensions={
                    isRevisionTarget ? unchangedDimensions : []
                  }
                  onRevisionAdopted={
                    isRevisionTarget ? handleRevisionAdopted : undefined
                  }
                  onRevisionDiscarded={
                    isRevisionTarget ? handleRevisionDiscarded : undefined
                  }
                />
              );
            })}
          </div>

          {showRevisionMode && hasAdoptedRevision && (
            <div className="rounded-[10px] border border-accent/50 bg-accent-soft/30 p-4">
              <p className="text-sm font-medium text-text">
                Nächster Schritt: Leite in Phase 4 neue Umsetzungsschritte für
                die überarbeiteten Annahmen ab.
              </p>
              <p className="mt-1 text-xs text-text-muted">
                Die Bewertung in Phase 3 kannst du optional aktualisieren,
                falls die Anpassung die Optionswahl infrage stellt.
              </p>
              <Link
                href={`/project/${projectId}/phase/4`}
                className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
              >
                Zu Phase 4: Validierende Umsetzung
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          )}
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
