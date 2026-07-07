"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  Target,
} from "lucide-react";
import type { TaskElaborationResponse } from "@/lib/schemas/taskElaboration";
import { StatementReferenceChip } from "./StatementReferenceChip";
import { CopyRefinementSection } from "./CopyRefinementSection";
import type { StatementRef } from "./types";

export function TaskElaborationPanel({
  taskId,
  elaboration,
  statementMap,
  expanded,
  onToggleExpanded,
  onElaboration,
}: {
  taskId: string;
  elaboration: TaskElaborationResponse | null;
  statementMap: Map<string, StatementRef>;
  expanded: boolean;
  onToggleExpanded: () => void;
  onElaboration: (data: TaskElaborationResponse) => void;
}) {
  const [content, setContent] = useState<TaskElaborationResponse | null>(
    elaboration
  );
  const [loading, setLoading] = useState(!elaboration);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (elaboration) {
      setContent(elaboration);
      setLoading(false);
    }
  }, [elaboration]);

  useEffect(() => {
    if (!elaboration && expanded) {
      void fetchElaboration(false);
    }
    // Fetch only when expanded for the first time without cached content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  async function fetchElaboration(regenerate: boolean) {
    if (regenerate) {
      setRegenerating(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const response = await fetch(
        `/api/implementation/tasks/${taskId}/elaborate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ regenerate }),
        }
      );
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          body?.error ??
            "Die Ausarbeitung konnte nicht erstellt werden. Erneut versuchen."
        );
      }
      setContent(body.elaboration);
      onElaboration(body.elaboration);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Die Ausarbeitung konnte nicht erstellt werden. Erneut versuchen."
      );
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  }

  function handleHeaderToggle() {
    onToggleExpanded();
  }

  const summaryText =
    content?.einleitungssatz ??
    (loading ? "Arbeitspaket wird erstellt …" : null);

  return (
    <div className="mt-1 rounded-md border border-border bg-background">
      <button
        type="button"
        onClick={handleHeaderToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-surface"
      >
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-text-muted transition-transform motion-reduce:transition-none ${
            expanded ? "rotate-180" : ""
          }`}
          aria-hidden
        />
        <span className="inline-flex min-w-0 flex-1 items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
          <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
          KI-Vorschlag — bitte prüfen
        </span>
        {loading && !expanded && (
          <LoaderCircle
            className="h-3.5 w-3.5 shrink-0 animate-spin text-text-muted"
            aria-hidden
          />
        )}
      </button>

      {!expanded && summaryText && (
        <p className="border-t border-border/60 px-3 py-2 text-xs text-text-muted line-clamp-2">
          {summaryText}
        </p>
      )}

      {expanded && (
        <div className="border-t border-border px-3 py-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
              Arbeitspaket wird erstellt …
            </div>
          ) : error && !content ? (
            <>
              <p className="text-sm text-danger-text">{error}</p>
              <button
                type="button"
                onClick={() => fetchElaboration(false)}
                className="mt-2 text-sm font-medium text-accent hover:underline"
              >
                Erneut versuchen
              </button>
            </>
          ) : content ? (
            <>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => fetchElaboration(true)}
                  disabled={regenerating}
                  className="inline-flex items-center gap-1 text-xs font-medium text-text-muted transition-colors hover:text-accent disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-3 w-3 ${regenerating ? "animate-spin" : ""}`}
                    aria-hidden
                  />
                  Neu generieren
                </button>
              </div>

              <p className="mt-3 text-[13px] text-text">{content.einleitungssatz}</p>

              <ol className="mt-4 flex flex-col gap-3">
                {content.schritte.map((schritt, index) => (
                  <li key={schritt.titel}>
                    <p className="text-sm font-medium text-text">
                      {index + 1}. {schritt.titel}
                    </p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {schritt.beschreibung}
                    </p>
                  </li>
                ))}
              </ol>

              {content.targeting.vorhanden && (
                <div className="mt-4 rounded-md bg-accent-soft/40 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Targeting-Spezifikation
                  </p>
                  <dl className="mt-2 grid gap-2 text-[13px]">
                    <div>
                      <dt className="font-medium text-text">Zielgruppe</dt>
                      <dd className="text-text-muted">
                        {content.targeting.spezifikation.zielgruppenbeschreibung}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-text">Demografie</dt>
                      <dd className="text-text-muted">
                        {content.targeting.spezifikation.demografie}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-text">Geografie</dt>
                      <dd className="text-text-muted">
                        {content.targeting.spezifikation.geografie}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-text">Interessen</dt>
                      <dd className="text-text-muted">
                        {content.targeting.spezifikation.interessen.join(", ")}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-text">Platzierung</dt>
                      <dd className="text-text-muted">
                        {content.targeting.spezifikation.platzierung}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-2 text-xs text-text-muted">
                    {content.targeting.hinweis}
                  </p>
                  {content.targeting.basiertAufAussageIds.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {content.targeting.basiertAufAussageIds.map((id) => {
                        const statement = statementMap.get(id);
                        if (!statement) return null;
                        return (
                          <StatementReferenceChip
                            key={id}
                            displayNumber={statement.displayNumber}
                            evidenceStatus={statement.evidenceStatus}
                            content={statement.content}
                            prefix="Basiert auf:"
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {content.formulierungsvorschlaege.length > 0 && (
                <CopyRefinementSection
                  key={content.schritte.map((schritt) => schritt.titel).join("·")}
                  taskId={taskId}
                  snippets={content.formulierungsvorschlaege}
                  onUpdated={(elaboration) => {
                    setContent(elaboration);
                    onElaboration(elaboration);
                  }}
                />
              )}

              <div className="mt-4 flex flex-col gap-2 border-t border-border pt-3 text-[13px]">
                <p className="inline-flex items-start gap-1.5 text-text-muted">
                  <Target
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent"
                    aria-hidden
                  />
                  <span>
                    <span className="font-medium text-text">Erfolgskriterium:</span>{" "}
                    {content.erfolgskriterium}
                  </span>
                </p>
                <p className="text-text-muted">
                  <span className="font-medium text-text">Zeitaufwand:</span>{" "}
                  {content.benoetigteRessourcen.zeitaufwandGeschaetzt}
                  <span className="mx-1.5 text-border">·</span>
                  <span className="font-medium text-text">Tools:</span>{" "}
                  {content.benoetigteRessourcen.tools.join(", ")}
                  {content.benoetigteRessourcen.budgetanteil && (
                    <>
                      <span className="mx-1.5 text-border">·</span>
                      <span className="font-medium text-text">Budgetanteil:</span>{" "}
                      {content.benoetigteRessourcen.budgetanteil}
                    </>
                  )}
                </p>
              </div>

              {content.offeneFragen.length > 0 && (
                <div className="mt-4 rounded-md border border-evidence-question-border/40 bg-evidence-question-bg/50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-evidence-question-text">
                    Offene Fragen
                  </p>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {content.offeneFragen.map((question) => (
                      <li key={question} className="text-[13px] text-text">
                        {question}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {error && <p className="mt-2 text-xs text-danger-text">{error}</p>}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
