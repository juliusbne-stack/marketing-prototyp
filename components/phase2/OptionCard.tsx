"use client";

import { useState } from "react";
import { Check, Info, Layers, Pencil } from "lucide-react";
import { CompactStatementRow } from "@/components/phase1/CompactStatementRow";
import type { StatementData } from "@/components/statements/types";
import { RevisionProposalCard } from "./RevisionProposalCard";
import { SegmentProfileDisclosure } from "./SegmentProfileDisclosure";
import {
  DIMENSION_ORDER,
  type OptionData,
  type UnchangedDimension,
} from "./types";

/** Soft washes — same family as Phase-1 profile cards; not evidence colors. */
const OPTION_CARD_TINTS = [
  "bg-[#F2F7F3]",
  "bg-[#F1F6F8]",
  "bg-[#F8F4F0]",
] as const;

const DIMENSION_TILE =
  "min-w-0 rounded-[8px] border border-border/55 bg-surface/95 px-3 py-2.5 shadow-[0_1px_0_rgba(31,36,33,0.03)]";

export function OptionCard({
  option,
  toneIndex = 0,
  onChanged,
  revisions = [],
  unchangedDimensions = [],
  onRevisionAdopted,
  onRevisionDiscarded,
}: {
  option: OptionData;
  /** Differentiates side-by-side options with a soft wash. */
  toneIndex?: number;
  onChanged: (option: OptionData) => void;
  /** Revision mode: pending AI revision proposals for this option's dimensions. */
  revisions?: StatementData[];
  /** Revision mode: dimensions the AI marked as not affected (with reason). */
  unchangedDimensions?: UnchangedDimension[];
  onRevisionAdopted?: (option: OptionData, revisionId: string) => void;
  onRevisionDiscarded?: (revisionId: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(option.title);
  const [draftSummary, setDraftSummary] = useState(option.summary ?? "");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDraft = option.status === "DRAFT";
  const tint =
    OPTION_CARD_TINTS[toneIndex % OPTION_CARD_TINTS.length] ??
    OPTION_CARD_TINTS[0];

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

  const frameClasses = isDraft
    ? `border border-dashed border-accent/50 ${tint}`
    : `border border-border/80 ${tint}`;

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-[10px] ${frameClasses} ${
        isBusy ? "opacity-60" : ""
      }`}
    >
      <header className="border-b border-border/60 bg-surface/85 px-4 py-3">
        {isEditing ? (
          <div>
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
                className="btn-primary btn-primary--sm"
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
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-background px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted ring-1 ring-border">
                  <Layers className="h-3.5 w-3.5" aria-hidden />
                  Option {toneIndex + 1}
                </span>
                {isDraft && (
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent-deep">
                    Entwurf
                  </span>
                )}
              </div>
              <h4 className="font-heading text-base font-medium text-text">
                {option.title}
              </h4>
              {option.summary && (
                <p className="mt-1 text-sm leading-relaxed text-text-muted">
                  {option.summary}
                </p>
              )}
              <p className="mt-2 text-xs text-text-muted">
                {factCount} Fakten · {assumptionCount} Annahmen · {questionCount}{" "}
                offen
              </p>
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
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-transparent text-text-muted transition-colors hover:border-border hover:bg-background hover:text-accent disabled:opacity-50"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        )}
      </header>

      <div className="flex flex-1 flex-col gap-2 p-3">
        {DIMENSION_ORDER.map(({ category, label }) => {
          const statement = option.statements.find(
            (candidate) => candidate.category === category
          );
          if (!statement) return null;
          const revision = revisions.find(
            (candidate) => candidate.category === category
          );
          const unchanged = unchangedDimensions.find(
            (candidate) => candidate.dimensionCategory === category
          );
          return (
            <div key={category} className={DIMENSION_TILE}>
              <CompactStatementRow
                statement={statement}
                aspectLabel={label}
                layout="column"
                showOriginInline
                allowAdopt={false}
                onChanged={handleStatementChanged}
              />
              {category === "OPT_TARGET_GROUP" && statement.segmentLabel && (
                <div className="mt-2 border-t border-border/50 pt-2">
                  <SegmentProfileDisclosure
                    projectId={statement.projectId}
                    segmentLabel={statement.segmentLabel}
                  />
                </div>
              )}
              {revision && onRevisionAdopted && onRevisionDiscarded && (
                <div className="mt-2">
                  <RevisionProposalCard
                    revision={revision}
                    optionId={option.id}
                    oldStatementId={statement.id}
                    onAdopted={onRevisionAdopted}
                    onDiscarded={onRevisionDiscarded}
                  />
                </div>
              )}
              {!revision && unchanged && (
                <span
                  title={unchanged.reason}
                  className="mt-2 inline-flex cursor-help items-center gap-1 rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-text-muted"
                >
                  <Info className="h-3 w-3" aria-hidden />
                  Laut Auswertung nicht betroffen
                </span>
              )}
            </div>
          );
        })}
      </div>

      {isDraft && (
        <footer className="border-t border-border/60 bg-surface/70 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-accent">
              Entwurf
            </span>
            <button
              type="button"
              onClick={() => patch({ adopt: true })}
              disabled={isBusy}
              className="btn-primary btn-primary--sm"
            >
              <Check className="h-3.5 w-3.5" aria-hidden />
              In Projektstand übernehmen
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-danger-text">{error}</p>}
        </footer>
      )}

      {!isDraft && error && (
        <p className="px-4 pb-3 text-xs text-danger-text">{error}</p>
      )}
    </article>
  );
}
