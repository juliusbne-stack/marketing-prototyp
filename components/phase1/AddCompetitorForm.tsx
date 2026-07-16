"use client";

import { useState } from "react";
import { Check, LoaderCircle, Plus, Search, Sparkles } from "lucide-react";
import type { EvidenceStatus, Origin } from "@prisma/client";
import type { StatementData } from "@/components/statements/types";
import {
  COMPETITOR_ASPECTS,
  COMPETITOR_ASPECT_LABELS,
  type CompetitorAspect,
} from "@/lib/competitorAspects";
import type { CompetitorResearchSuggestion } from "@/lib/schemas/competitorResearch";
import { SIMULATED_FACT_TOOLTIP } from "@/components/statements/EvidenceBadge";

const EVIDENCE_OPTIONS: { value: EvidenceStatus; label: string }[] = [
  { value: "FACT", label: "Fakt" },
  { value: "ASSUMPTION", label: "Annahme" },
  { value: "OPEN_QUESTION", label: "Offene Frage" },
];

const REQUIRED_ASPECTS: CompetitorAspect[] = ["ENTITY_TYPE", "OFFERING"];
const OPTIONAL_ASPECTS = COMPETITOR_ASPECTS.filter(
  (aspect) => !REQUIRED_ASPECTS.includes(aspect)
);

const ASPECT_PLACEHOLDERS: Record<CompetitorAspect, string> = {
  ENTITY_TYPE:
    "Art des Akteurs aus Kundensicht (z. B. direkter Wettbewerber mit ähnlichem Angebot) …",
  OFFERING: "Kernleistungen und Produktumfang …",
  TARGET_CUSTOMERS: "Primäre Zielgruppe (optional) …",
  PRICING: "Preismodell und ungefähre Preislage (optional) …",
  SCALE: "Größe, Reichweite, Marktstellung (optional) …",
  RELEVANCE: "Warum dieser Akteur für euch relevant ist (optional) …",
};

type AspectField = {
  content: string;
  evidenceStatus: EvidenceStatus;
  origin: Origin;
  sourceRef?: string | null;
  justification?: string | null;
};

function emptyAspectField(): AspectField {
  return {
    content: "",
    evidenceStatus: "ASSUMPTION",
    origin: "USER_INPUT",
  };
}

function emptyAspectFields(): Record<CompetitorAspect, AspectField> {
  return Object.fromEntries(
    COMPETITOR_ASPECTS.map((aspect) => [aspect, emptyAspectField()])
  ) as Record<CompetitorAspect, AspectField>;
}

function evidenceForManualAspect(
  aspect: CompetitorAspect,
  evidenceStatus: EvidenceStatus
): EvidenceStatus {
  if (aspect === "RELEVANCE" && evidenceStatus === "FACT") {
    return "ASSUMPTION";
  }
  return evidenceStatus;
}

function suggestionToField(
  suggestion: CompetitorResearchSuggestion
): AspectField {
  return {
    content: suggestion.content,
    evidenceStatus: suggestion.evidenceStatus,
    origin: suggestion.origin,
    sourceRef: suggestion.sourceRef ?? null,
    justification: suggestion.justification,
  };
}

/** Manual new COMPETITOR profile with optional dimensions and simulated research. */
export function AddCompetitorForm({
  projectId,
  existingLabels,
  onAdded,
}: {
  projectId: string;
  existingLabels: string[];
  onAdded: (statement: StatementData) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [competitorLabel, setCompetitorLabel] = useState("");
  const [aspectFields, setAspectFields] = useState(emptyAspectFields);
  const [manualEvidenceStatus, setManualEvidenceStatus] =
    useState<EvidenceStatus>("ASSUMPTION");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [researchPreview, setResearchPreview] = useState<
    CompetitorResearchSuggestion[] | null
  >(null);
  const [confirmedResearchAspects, setConfirmedResearchAspects] = useState<
    Set<CompetitorAspect>
  >(() => new Set());
  const [isResearching, setIsResearching] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);

  const normalizedExisting = existingLabels.map((label) =>
    label.trim().toLowerCase()
  );

  function resetForm() {
    setCompetitorLabel("");
    setAspectFields(emptyAspectFields());
    setResearchPreview(null);
    setConfirmedResearchAspects(new Set());
    setError(null);
    setResearchError(null);
  }

  function updateAspectContent(aspect: CompetitorAspect, value: string) {
    setAspectFields((current) => ({
      ...current,
      [aspect]: {
        ...emptyAspectField(),
        content: value,
        evidenceStatus: manualEvidenceStatus,
      },
    }));
    setConfirmedResearchAspects((current) => {
      if (!current.has(aspect)) return current;
      const next = new Set(current);
      next.delete(aspect);
      return next;
    });
  }

  function adoptResearchSuggestion(suggestion: CompetitorResearchSuggestion) {
    setAspectFields((current) => ({
      ...current,
      [suggestion.competitorAspect]: suggestionToField(suggestion),
    }));
    setConfirmedResearchAspects(
      (current) => new Set([...current, suggestion.competitorAspect])
    );
  }

  function adoptAllResearchSuggestions() {
    if (!researchPreview) return;
    const nextFields = { ...aspectFields };
    const nextConfirmed = new Set(confirmedResearchAspects);
    for (const suggestion of researchPreview) {
      nextFields[suggestion.competitorAspect] = suggestionToField(suggestion);
      nextConfirmed.add(suggestion.competitorAspect);
    }
    setAspectFields(nextFields);
    setConfirmedResearchAspects(nextConfirmed);
  }

  function discardResearchPreview() {
    setResearchPreview(null);
    setConfirmedResearchAspects(new Set());
    setResearchError(null);
  }

  async function handleResearch() {
    const trimmedLabel = competitorLabel.trim();
    if (!trimmedLabel || isResearching) return;

    const knownFields = Object.fromEntries(
      COMPETITOR_ASPECTS.flatMap((aspect) => {
        const content = aspectFields[aspect].content.trim();
        return content ? [[aspect, content]] : [];
      })
    ) as Partial<Record<CompetitorAspect, string>>;

    setIsResearching(true);
    setResearchError(null);
    try {
      const response = await fetch("/api/ai/1/competitor-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          competitorLabel: trimmedLabel,
          ...(Object.keys(knownFields).length > 0 ? { knownFields } : {}),
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          body?.error ??
            "Die simulierte Recherche ist fehlgeschlagen. Erneut versuchen — deine Eingaben bleiben erhalten."
        );
      }
      const statements = (body?.statements ??
        []) as CompetitorResearchSuggestion[];
      setResearchPreview(statements);
      setConfirmedResearchAspects(new Set());
    } catch (err) {
      setResearchError(
        err instanceof Error
          ? err.message
          : "Die simulierte Recherche ist fehlgeschlagen. Erneut versuchen — deine Eingaben bleiben erhalten."
      );
    } finally {
      setIsResearching(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedLabel = competitorLabel.trim();
    const entityType = aspectFields.ENTITY_TYPE.content.trim();
    const offering = aspectFields.OFFERING.content.trim();
    if (!trimmedLabel || !entityType || !offering || isSubmitting) return;

    if (normalizedExisting.includes(trimmedLabel.toLowerCase())) {
      setError("Ein Akteur mit diesem Namen ist bereits erfasst.");
      return;
    }

    const aspectsToCreate = COMPETITOR_ASPECTS.filter((aspect) =>
      aspectFields[aspect].content.trim()
    );

    setIsSubmitting(true);
    setError(null);
    try {
      const created: StatementData[] = [];
      for (const aspect of aspectsToCreate) {
        const field = aspectFields[aspect];
        const isManual = field.origin === "USER_INPUT";
        const response = await fetch("/api/statements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            phase: 1,
            category: "COMPETITOR",
            content: field.content.trim(),
            evidenceStatus: isManual
              ? evidenceForManualAspect(aspect, manualEvidenceStatus)
              : field.evidenceStatus,
            origin: field.origin,
            competitorLabel: trimmedLabel,
            competitorAspect: aspect,
            ...(field.justification?.trim()
              ? { justification: field.justification.trim() }
              : {}),
            ...(field.sourceRef?.trim()
              ? { sourceRef: field.sourceRef.trim() }
              : {}),
          }),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(
            body?.error ??
              "Der Akteur konnte nicht angelegt werden. Erneut versuchen — deine Eingaben bleiben erhalten."
          );
        }
        created.push((await response.json()) as StatementData);
      }
      for (const statement of created) {
        onAdded(statement);
      }
      resetForm();
      setIsOpen(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Der Akteur konnte nicht angelegt werden. Erneut versuchen — deine Eingaben bleiben erhalten."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex w-full items-center gap-1.5 px-4 py-3 text-left text-xs font-medium text-accent transition-colors duration-200 group-hover/add-actor:underline"
      >
        <Plus className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover/add-actor:scale-110" aria-hidden />
        Akteur hinzufügen
      </button>
    );
  }

  const inputClasses =
    "w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-text placeholder:text-text-muted";
  const canResearch = !!competitorLabel.trim() && !isSubmitting && !isResearching;
  const hasUnconfirmedResearch =
    !!researchPreview &&
    researchPreview.some(
      (suggestion) => !confirmedResearchAspects.has(suggestion.competitorAspect)
    );

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[10px] border border-dashed border-border bg-surface p-3"
    >
      <div className="flex flex-wrap items-start gap-2">
        <input
          type="text"
          value={competitorLabel}
          onChange={(event) => {
            setCompetitorLabel(event.target.value);
            discardResearchPreview();
          }}
          autoFocus
          placeholder="Name des Akteurs (z. B. LocalGym App)"
          aria-label="Name des Akteurs"
          className={`${inputClasses} min-w-[12rem] flex-1`}
          disabled={isSubmitting || isResearching}
        />
        <button
          type="button"
          onClick={handleResearch}
          disabled={!canResearch}
          title={
            canResearch
              ? "Simulierte Websuche zu diesem Akteur (fiktive Ergebnisse)"
              : "Zuerst den Akteursnamen eingeben"
          }
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-accent/50 bg-accent-soft/40 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isResearching ? (
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Search className="h-3.5 w-3.5" aria-hidden />
          )}
          {isResearching ? "Recherchiert …" : "KI-Recherche"}
        </button>
      </div>

      {isResearching && (
        <p className="mt-2 text-xs text-text-muted" aria-live="polite">
          Die KI simuliert eine Websuche zu „{competitorLabel.trim()}" …
        </p>
      )}

      {researchError && (
        <p className="mt-2 text-xs text-danger-text">{researchError}</p>
      )}

      {researchPreview && researchPreview.length > 0 && (
        <div className="mt-3 rounded-[10px] border border-dashed border-accent/50 bg-accent-soft/20 p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="inline-flex items-center gap-1.5 text-xs font-medium text-accent">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Simulierte Recherche
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium">
                Entwurf
              </span>
            </p>
            <button
              type="button"
              onClick={discardResearchPreview}
              className="text-xs text-text-muted transition-colors hover:text-text"
            >
              Verwerfen
            </button>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            Fiktive Rechercheergebnisse — bitte prüfen und gezielt übernehmen.
          </p>

          <ul className="mt-3 space-y-2">
            {researchPreview.map((suggestion) => {
              const adopted = confirmedResearchAspects.has(
                suggestion.competitorAspect
              );
              return (
                <li
                  key={suggestion.competitorAspect}
                  className="rounded-md border border-border/70 bg-surface px-3 py-2"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-text">
                        {COMPETITOR_ASPECT_LABELS[suggestion.competitorAspect]}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-text-muted">
                        {suggestion.content}
                      </p>
                      {suggestion.sourceRef && (
                        <p className="mt-1 text-[11px] text-text-muted">
                          Quelle: {suggestion.sourceRef}
                        </p>
                      )}
                    </div>
                    {adopted ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent">
                        <Check className="h-3 w-3" aria-hidden />
                        Übernommen
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => adoptResearchSuggestion(suggestion)}
                        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-accent px-2.5 py-1 text-[11px] font-medium text-accent transition-colors hover:bg-accent-soft"
                      >
                        <Check className="h-3 w-3" aria-hidden />
                        Übernehmen
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {hasUnconfirmedResearch && (
            <button
              type="button"
              onClick={adoptAllResearchSuggestions}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent/90"
            >
              <Check className="h-3.5 w-3.5" aria-hidden />
              Alle übernehmen
            </button>
          )}
        </div>
      )}

      <div className="mt-3 space-y-3">
        {REQUIRED_ASPECTS.map((aspect) => (
          <label key={aspect} className="block text-xs font-medium text-text">
            {COMPETITOR_ASPECT_LABELS[aspect]}
            <textarea
              value={aspectFields[aspect].content}
              onChange={(event) =>
                updateAspectContent(aspect, event.target.value)
              }
              rows={2}
              placeholder={ASPECT_PLACEHOLDERS[aspect]}
              aria-label={COMPETITOR_ASPECT_LABELS[aspect]}
              className={`${inputClasses} mt-1`}
              disabled={isSubmitting || isResearching}
            />
          </label>
        ))}
      </div>

      <fieldset className="mt-3">
        <legend className="text-xs font-medium text-text-muted">
          Weitere Angaben (optional)
        </legend>
        <div className="mt-2 space-y-3">
          {OPTIONAL_ASPECTS.map((aspect) => (
            <label key={aspect} className="block text-xs font-medium text-text">
              {COMPETITOR_ASPECT_LABELS[aspect]}
              <textarea
                value={aspectFields[aspect].content}
                onChange={(event) =>
                  updateAspectContent(aspect, event.target.value)
                }
                rows={2}
                placeholder={ASPECT_PLACEHOLDERS[aspect]}
                aria-label={COMPETITOR_ASPECT_LABELS[aspect]}
                className={`${inputClasses} mt-1`}
                disabled={isSubmitting || isResearching}
              />
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={manualEvidenceStatus}
          onChange={(event) =>
            setManualEvidenceStatus(event.target.value as EvidenceStatus)
          }
          aria-label="Evidenzstatus für manuelle Angaben"
          className="rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-text"
          disabled={isSubmitting || isResearching}
          title={SIMULATED_FACT_TOOLTIP}
        >
          {EVIDENCE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label} (manuell)
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={
            isSubmitting ||
            isResearching ||
            !competitorLabel.trim() ||
            !aspectFields.ENTITY_TYPE.content.trim() ||
            !aspectFields.OFFERING.content.trim()
          }
          className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
        >
          {isSubmitting ? "Wird angelegt …" : "Hinzufügen"}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            resetForm();
          }}
          disabled={isSubmitting || isResearching}
          className="rounded-md border border-border px-3 py-1.5 text-xs text-text transition-colors hover:bg-background"
        >
          Abbrechen
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-danger-text">{error}</p>}
    </form>
  );
}
