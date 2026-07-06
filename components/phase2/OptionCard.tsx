"use client";

import { useState } from "react";
import { Check, Pencil } from "lucide-react";
import { StatementCard } from "@/components/statements/StatementCard";
import type { StatementData } from "@/components/statements/types";
import { DIMENSION_ORDER, type OptionData } from "./types";

export function OptionCard({
  option,
  onChanged,
}: {
  option: OptionData;
  onChanged: (option: OptionData) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(option.title);
  const [draftSummary, setDraftSummary] = useState(option.summary ?? "");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDraft = option.status === "DRAFT";

  async function patch(data: Record<string, unknown>) {
    setIsBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/options", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: option.id, ...data }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(
          body?.error ??
            "Die Änderung konnte nicht gespeichert werden. Erneut versuchen."
        );
      }
      const updated: OptionData = await response.json();
      onChanged(updated);
      return true;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Die Änderung konnte nicht gespeichert werden. Erneut versuchen."
      );
      return false;
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSaveHeader() {
    const title = draftTitle.trim();
    const summary = draftSummary.trim();
    if (!title || !summary) return;
    const ok = await patch({ title, summary });
    if (ok) setIsEditing(false);
  }

  function handleStatementChanged(updated: StatementData) {
    onChanged({
      ...option,
      statements: option.statements.map((statement) =>
        statement.id === updated.id ? updated : statement
      ),
    });
  }

  // Mini evidence balance of the bundle (UI_KONZEPT §4, phase 2).
  const factCount = option.statements.filter(
    (statement) => statement.evidenceStatus === "FACT"
  ).length;
  const assumptionCount = option.statements.filter(
    (statement) => statement.evidenceStatus === "ASSUMPTION"
  ).length;
  const questionCount = option.statements.filter(
    (statement) => statement.evidenceStatus === "OPEN_QUESTION"
  ).length;

  // Draft options: dashed frame like statement drafts; adopted: solid frame.
  const frameClasses = isDraft
    ? "border border-dashed border-accent/50 bg-accent-soft/30"
    : "border border-border bg-surface";

  return (
    <article
      className={`flex flex-col rounded-[10px] p-4 ${frameClasses} ${
        isBusy ? "opacity-60" : ""
      }`}
    >
      <header className="flex items-start justify-between gap-2">
        {isEditing ? (
          <div className="flex-1">
            <input
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              aria-label="Titel der Option"
              className="w-full rounded-md border border-border bg-surface p-2 font-heading text-base font-medium text-text"
            />
            <textarea
              value={draftSummary}
              onChange={(event) => setDraftSummary(event.target.value)}
              rows={3}
              aria-label="Kurzbeschreibung der Option"
              className="mt-2 w-full rounded-md border border-border bg-surface p-2 text-sm text-text"
            />
            <div className="mt-1.5 flex gap-2">
              <button
                type="button"
                onClick={handleSaveHeader}
                disabled={isBusy || !draftTitle.trim() || !draftSummary.trim()}
                className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
              >
                Speichern
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setDraftTitle(option.title);
                  setDraftSummary(option.summary ?? "");
                }}
                disabled={isBusy}
                className="rounded-md border border-border px-3 py-1 text-xs text-text transition-colors hover:bg-background"
              >
                Abbrechen
              </button>
            </div>
          </div>
        ) : (
          <>
            <div>
              <h4 className="font-heading text-base font-medium text-text">
                {option.title}
              </h4>
              {option.summary && (
                <p className="mt-1 text-sm text-text-muted">{option.summary}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setDraftTitle(option.title);
                setDraftSummary(option.summary ?? "");
                setIsEditing(true);
              }}
              disabled={isBusy}
              aria-label="Titel und Kurzbeschreibung bearbeiten"
              className="rounded p-1 text-text-muted transition-colors hover:text-accent disabled:opacity-50"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
            </button>
          </>
        )}
      </header>

      <dl className="mt-4 flex flex-1 flex-col gap-3">
        {DIMENSION_ORDER.map(({ category, label }) => {
          const statement = option.statements.find(
            (candidate) => candidate.category === category
          );
          if (!statement) return null;
          return (
            <div key={category}>
              <dt className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
                {label}
              </dt>
              <dd>
                <StatementCard
                  statement={statement}
                  onChanged={handleStatementChanged}
                  showAdoptAction={false}
                  compact
                />
              </dd>
            </div>
          );
        })}
      </dl>

      <footer className="mt-4 border-t border-border/70 pt-3">
        <p className="text-xs text-text-muted">
          {factCount} Fakt-gestützt · {assumptionCount} Annahmen ·{" "}
          {questionCount} offen
        </p>

        {isDraft && (
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-accent">
              Entwurf
            </span>
            <button
              type="button"
              onClick={() => patch({ adopt: true })}
              disabled={isBusy}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" aria-hidden />
              In Projektstand übernehmen
            </button>
          </div>
        )}

        {error && <p className="mt-2 text-xs text-danger-text">{error}</p>}
      </footer>
    </article>
  );
}
