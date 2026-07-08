"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  LoaderCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import type { TaskElaborationResponse } from "@/lib/schemas/taskElaboration";
import { EvidenceBadge } from "@/components/statements/EvidenceBadge";
import { CopyRefinementSection } from "./CopyRefinementSection";
import { ElaborationContent } from "./ElaborationContent";
import { ElaborationRefinementSection } from "./ElaborationRefinementSection";
import type { StatementRef } from "./types";

function TaskAssumptionContextSection({
  statement,
}: {
  statement: StatementRef;
}) {
  const introText =
    statement.evidenceStatus === "FACT"
      ? "Diese Aufgabe stützt sich auf diese belegte Aussage."
      : "Diese Aufgabe zahlt auf die Prüfung dieser Annahme ein.";

  return (
    <div className="mb-4 rounded-md border border-border/80 bg-surface/60 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
        Wozu diese Aufgabe beiträgt
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <EvidenceBadge status={statement.evidenceStatus} />
      </div>
      <p className="mt-2 text-sm leading-relaxed text-text">{statement.content}</p>
      <p className="mt-2 text-xs text-text-muted">{introText}</p>
    </div>
  );
}

export function TaskElaborationPanel({
  taskId,
  annahmenBezugId,
  elaboration,
  statementMap,
  expanded,
  onToggleExpanded,
  onElaboration,
}: {
  taskId: string;
  annahmenBezugId: string | null;
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
  const [refineOpen, setRefineOpen] = useState(false);
  const [refineInitialFeedback, setRefineInitialFeedback] = useState<
    string | undefined
  >(undefined);

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

  function openRefinement(initialFeedback?: string) {
    setRefineInitialFeedback(initialFeedback);
    setRefineOpen(true);
  }

  function handleToggleRefinement() {
    if (refineOpen) {
      setRefineOpen(false);
      setRefineInitialFeedback(undefined);
    } else {
      openRefinement();
    }
  }

  function handleStepReject(stepTitle: string) {
    openRefinement(`Schritt "${stepTitle}": `);
  }

  const summaryText =
    content?.einleitungssatz ??
    (loading ? "Arbeitspaket wird erstellt …" : null);

  const assumptionRef = annahmenBezugId
    ? (statementMap.get(annahmenBezugId) ?? null)
    : null;

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
          {assumptionRef && (
            <TaskAssumptionContextSection statement={assumptionRef} />
          )}
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
                  onClick={handleToggleRefinement}
                  disabled={regenerating}
                  aria-expanded={refineOpen}
                  className={`inline-flex items-center gap-1 text-xs font-medium transition-colors hover:text-accent disabled:opacity-50 ${
                    refineOpen ? "text-accent" : "text-text-muted"
                  }`}
                >
                  <Sparkles className="h-3 w-3" aria-hidden />
                  Mit Feedback überarbeiten
                </button>
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

              <div className="mt-3">
                <ElaborationContent
                  content={content}
                  statementMap={statementMap}
                  onStepReject={handleStepReject}
                  formulierungsvorschlaegeSlot={
                    content.formulierungsvorschlaege.length > 0 ? (
                      <CopyRefinementSection
                        key={content.schritte
                          .map((schritt) => schritt.titel)
                          .join("·")}
                        taskId={taskId}
                        snippets={content.formulierungsvorschlaege}
                        onUpdated={(elaboration) => {
                          setContent(elaboration);
                          onElaboration(elaboration);
                        }}
                      />
                    ) : undefined
                  }
                />
              </div>

              {refineOpen && (
                <ElaborationRefinementSection
                  taskId={taskId}
                  currentContent={content}
                  statementMap={statementMap}
                  initialFeedback={refineInitialFeedback}
                  onAdopted={(elaboration) => {
                    setContent(elaboration);
                    onElaboration(elaboration);
                    setRefineOpen(false);
                    setRefineInitialFeedback(undefined);
                  }}
                  onClose={() => {
                    setRefineOpen(false);
                    setRefineInitialFeedback(undefined);
                  }}
                />
              )}

              {error && <p className="mt-2 text-xs text-danger-text">{error}</p>}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
