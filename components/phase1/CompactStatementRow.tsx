"use client";

import { useState } from "react";
import { Check, ChevronRight, Pencil, Trash2 } from "lucide-react";
import type { ValidationHistoryCounts } from "@/lib/validation";
import { useConfirm } from "@/components/ui/DialogProvider";
import { EvidenceBadge } from "@/components/statements/EvidenceBadge";
import { OriginTag } from "@/components/statements/OriginTag";
import type { StatementData } from "@/components/statements/types";
import { ValidationHistoryChip } from "@/components/statements/ValidationHistoryChip";

export function CompactStatementRow({
  statement,
  aspectLabel,
  showOriginInline = false,
  showAdoptInline = false,
  allowAdopt = true,
  validationHistory,
  onChanged,
  onDeleted,
  emptyPlaceholder,
  layout = "row",
  factTooltip,
}: {
  statement?: StatementData;
  aspectLabel?: string;
  showOriginInline?: boolean;
  /** Draft label + adopt button visible while collapsed (e.g. Kundenprobleme list). */
  showAdoptInline?: boolean;
  /** Phase 2 adopts whole options — hide per-statement adopt there. */
  allowAdopt?: boolean;
  validationHistory?: ValidationHistoryCounts | null;
  onChanged?: (statement: StatementData) => void;
  onDeleted?: (id: string) => void;
  emptyPlaceholder?: string;
  layout?: "row" | "column";
  /** Tooltip für FACT-Badge (z. B. im Wettbewerbsbereich). */
  factTooltip?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftContent, setDraftContent] = useState(statement?.content ?? "");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirm = useConfirm();

  const labelClasses =
    "text-xs font-semibold uppercase tracking-wide text-text-muted";
  // Column layout is usually nested in padded aspect tiles — keep vertical
  // padding minimal so the tile background reads cleanly.
  const rowPadding = layout === "column" ? "py-0" : "py-3";
  const useAspectGrid = layout === "row" && !!aspectLabel;

  const aspectLabelCell = aspectLabel ? (
    <span className={`pt-0.5 text-right whitespace-nowrap ${labelClasses}`}>
      {aspectLabel}
    </span>
  ) : null;

  if (!statement) {
    if (useAspectGrid) {
      return (
        <div
          className={`col-span-3 grid grid-cols-subgrid items-start gap-x-3 ${rowPadding}`}
        >
          <span aria-hidden className="w-5 shrink-0" />
          {aspectLabelCell}
          <p className="min-w-0 text-sm text-text-muted">
            {emptyPlaceholder ?? "Noch keine Aussage vorhanden."}
          </p>
        </div>
      );
    }

    return (
      <div className={`min-w-0 ${rowPadding}`}>
        {layout === "column" ? (
          <div className="flex min-w-0 flex-col gap-1.5">
            {aspectLabel && (
              <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                {aspectLabel}
              </span>
            )}
            <p className="break-words text-sm text-text-muted">
              {emptyPlaceholder ?? "Noch keine Aussage vorhanden."}
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            {aspectLabelCell}
            <p className="text-sm text-text-muted">
              {emptyPlaceholder ?? "Noch keine Aussage vorhanden."}
            </p>
          </div>
        )}
      </div>
    );
  }

  const row = statement;

  async function patch(data: Record<string, unknown>) {
    if (!onChanged) return false;
    setIsBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/statements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, ...data }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(
          body?.error ?? "Die Änderung konnte nicht gespeichert werden. Erneut versuchen."
        );
      }
      const updated: StatementData = await response.json();
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

  async function handleDelete() {
    if (!onDeleted) return;
    const confirmed = await confirm({
      title: "Aussage löschen?",
      message:
        "Diese Aussage endgültig löschen? Der Vorgang kann nicht rückgängig gemacht werden.",
      confirmLabel: "Löschen",
      cancelLabel: "Abbrechen",
      variant: "danger",
    });
    if (!confirmed) return;

    setIsBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/statements?id=${encodeURIComponent(row.id)}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        throw new Error("Die Aussage konnte nicht gelöscht werden. Erneut versuchen.");
      }
      onDeleted(row.id);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Die Aussage konnte nicht gelöscht werden. Erneut versuchen."
      );
      setIsBusy(false);
    }
  }

  async function handleSaveContent() {
    const trimmed = draftContent.trim();
    if (!trimmed) return;
    const ok = await patch({ content: trimmed });
    if (ok) setIsEditing(false);
  }

  const metaParts: { label: string; text: string }[] = [];
  if (row.justification) {
    metaParts.push({ label: "Begründung", text: row.justification });
  }
  if (row.sourceRef) {
    metaParts.push({ label: "Quelle", text: row.sourceRef });
  }
  if (row.uncertainty) {
    metaParts.push({ label: "Unsicher", text: row.uncertainty });
  }

  const inlineAdoptAction =
    allowAdopt && showAdoptInline && !row.adopted && !expanded ? (
      <>
        <span className="text-xs font-medium uppercase tracking-wide text-accent">
          Entwurf
        </span>
        <button
          type="button"
          onClick={() => patch({ adopted: true })}
          disabled={isBusy}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-accent-bright active:bg-brand-dark disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" aria-hidden />
          Einzeln übernehmen
        </button>
      </>
    ) : null;

  const contentRow = (
    <div className="flex min-w-0 flex-col gap-1.5">
      <p className="break-words text-sm leading-relaxed text-text">
        {row.content}
      </p>
      <span className="inline-flex flex-wrap items-center gap-1.5">
        {showOriginInline && <OriginTag origin={row.origin} />}
        <EvidenceBadge
          status={row.evidenceStatus}
          onChange={(status) => patch({ evidenceStatus: status })}
          disabled={isBusy}
          factTooltip={factTooltip}
        />
        {inlineAdoptAction}
      </span>
    </div>
  );

  const expandedPanel = expanded ? (
    <div className="mt-3 border-t border-border/70 pt-3">
      {!showOriginInline && (
        <div className="mb-2">
          <OriginTag origin={row.origin} />
        </div>
      )}

      {metaParts.length > 0 && (
        <div className="space-y-1 break-words text-[13px] text-text-muted">
          {metaParts.map((part) => (
            <p key={part.label} className="break-words">
              <span className="font-medium">{part.label}:</span> {part.text}
            </p>
          ))}
        </div>
      )}

      {validationHistory && (
        <div className="mt-2">
          <ValidationHistoryChip counts={validationHistory} />
        </div>
      )}

      {isEditing ? (
        <div className="mt-3">
          <textarea
            value={draftContent}
            onChange={(event) => setDraftContent(event.target.value)}
            rows={3}
            aria-label="Inhalt der Aussage"
            className="w-full rounded-md border border-border bg-surface p-2 text-sm text-text"
          />
          <div className="mt-1.5 flex gap-2">
            <button
              type="button"
              onClick={handleSaveContent}
              disabled={isBusy || !draftContent.trim()}
              className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-accent-bright active:bg-brand-dark disabled:opacity-50"
            >
              Speichern
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setDraftContent(row.content);
              }}
              disabled={isBusy}
              className="rounded-md border border-border px-3 py-1 text-xs text-text transition-colors hover:bg-background"
            >
              Abbrechen
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setDraftContent(row.content);
                setIsEditing(true);
              }}
              disabled={isBusy}
              aria-label="Aussage bearbeiten"
              className="rounded p-1 text-text-muted transition-colors hover:text-accent disabled:opacity-50"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
            </button>
            {onDeleted && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isBusy}
                aria-label="Aussage löschen"
                className="rounded p-1 text-text-muted transition-colors hover:text-danger-text disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            )}
          </div>

          {allowAdopt && !row.adopted && (
            <button
              type="button"
              onClick={() => patch({ adopted: true })}
              disabled={isBusy}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-bright active:bg-brand-dark disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" aria-hidden />
              Einzeln übernehmen
            </button>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-xs text-danger-text">{error}</p>}
    </div>
  ) : null;

  const chevronButton = (
    <button
      type="button"
      onClick={() => setExpanded((value) => !value)}
      aria-expanded={expanded}
      aria-label={expanded ? "Zeile einklappen" : "Zeile aufklappen"}
      className="shrink-0 rounded p-0.5 text-text-muted transition-colors hover:text-accent"
    >
      <ChevronRight
        className={`h-4 w-4 transition-transform ${expanded ? "rotate-90" : ""}`}
        aria-hidden
      />
    </button>
  );

  if (useAspectGrid) {
    return (
      <div
        className={`col-span-3 grid grid-cols-subgrid items-start gap-x-3 min-w-0 ${rowPadding} ${isBusy ? "opacity-60" : ""}`}
      >
        <div className="mt-0.5">{chevronButton}</div>
        {aspectLabelCell}
        <div className="min-w-0">
          {contentRow}
          {error && !expanded && (
            <p className="mt-1.5 text-xs text-danger-text">{error}</p>
          )}
          {expandedPanel}
        </div>
      </div>
    );
  }

  if (layout === "column") {
    return (
      <div className={`min-w-0 ${rowPadding} ${isBusy ? "opacity-60" : ""}`}>
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            {aspectLabel ? (
              <span className={labelClasses}>{aspectLabel}</span>
            ) : (
              <span />
            )}
            {chevronButton}
          </div>

          {contentRow}

          {error && !expanded && (
            <p className="mt-1.5 text-xs text-danger-text">{error}</p>
          )}

          {expandedPanel}
        </div>
      </div>
    );
  }

  return (
    <div className={`min-w-0 ${rowPadding} ${isBusy ? "opacity-60" : ""}`}>
      <div className="flex min-w-0 items-start gap-1.5">
        <div className="mt-0.5">{chevronButton}</div>

        <div className="min-w-0 flex-1">
          {contentRow}

          {error && !expanded && (
            <p className="mt-1.5 text-xs text-danger-text">{error}</p>
          )}

          {expandedPanel}
        </div>
      </div>
    </div>
  );
}
