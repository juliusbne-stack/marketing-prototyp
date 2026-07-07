"use client";

import { useState } from "react";
import { Check, Pencil, Trash2 } from "lucide-react";
import type { EvidenceStatus } from "@prisma/client";
import type { ValidationHistoryCounts } from "@/lib/validation";
import { EvidenceBadge } from "./EvidenceBadge";
import { OriginTag } from "./OriginTag";
import type { StatementData } from "./types";
import { ValidationHistoryChip } from "./ValidationHistoryChip";

// Meta text longer than this is collapsed to one line with a "Mehr" toggle.
const META_COLLAPSE_THRESHOLD = 120;

export function StatementCard({
  statement,
  onChanged,
  onDeleted,
  showAdoptAction = true,
  compact = false,
  validationHistory,
}: {
  statement: StatementData;
  onChanged: (statement: StatementData) => void;
  /** Without a handler the delete action is hidden (e.g. option dimensions, which must stay complete). */
  onDeleted?: (id: string) => void;
  /** Phase 2 adopts whole options (hypothesis bundles), not single dimensions. */
  showAdoptAction?: boolean;
  compact?: boolean;
  /** Cumulative assessed feedback counts — chip hidden when absent or empty. */
  validationHistory?: ValidationHistoryCounts | null;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftContent, setDraftContent] = useState(statement.content);
  const [metaExpanded, setMetaExpanded] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function patch(data: Record<string, unknown>) {
    setIsBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/statements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: statement.id, ...data }),
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
    setIsBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/statements?id=${encodeURIComponent(statement.id)}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        throw new Error("Die Aussage konnte nicht gelöscht werden. Erneut versuchen.");
      }
      onDeleted?.(statement.id);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Die Aussage konnte nicht gelöscht werden. Erneut versuchen."
      );
      setIsBusy(false);
    }
  }

  async function handleStatusChange(status: EvidenceStatus) {
    await patch({ evidenceStatus: status });
  }

  async function handleSaveContent() {
    const trimmed = draftContent.trim();
    if (!trimmed) return;
    const ok = await patch({ content: trimmed });
    if (ok) setIsEditing(false);
  }

  const metaParts: { label: string; text: string }[] = [];
  if (statement.justification) {
    metaParts.push({ label: "Begründung", text: statement.justification });
  }
  if (statement.sourceRef) {
    metaParts.push({ label: "Quelle", text: statement.sourceRef });
  }
  if (statement.uncertainty) {
    metaParts.push({ label: "Unsicher", text: statement.uncertainty });
  }
  const metaLength = metaParts.reduce(
    (sum, part) => sum + part.label.length + part.text.length,
    0
  );
  const metaCollapsible = metaLength > META_COLLAPSE_THRESHOLD;

  // Draft (adopted=false): dashed border + very light petrol background.
  // Adopted (adopted=true): solid border, white background. (F10/NF5)
  const cardClasses = statement.adopted
    ? "border border-border bg-surface"
    : "border border-dashed border-accent/50 bg-accent-soft/40";

  return (
    <div
      className={`rounded-[10px] transition-colors ${compact ? "p-3" : "p-4"} ${cardClasses} ${
        isBusy ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <EvidenceBadge
            status={statement.evidenceStatus}
            onChange={handleStatusChange}
            disabled={isBusy}
          />
          {validationHistory && (
            <ValidationHistoryChip counts={validationHistory} />
          )}
        </div>
        <div className="flex items-center gap-2">
          <OriginTag origin={statement.origin} />
          <button
            type="button"
            onClick={() => {
              setDraftContent(statement.content);
              setIsEditing(true);
            }}
            disabled={isBusy || isEditing}
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
      </div>

      {isEditing ? (
        <div className="mt-2">
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
              className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
            >
              Speichern
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setDraftContent(statement.content);
              }}
              disabled={isBusy}
              className="rounded-md border border-border px-3 py-1 text-xs text-text transition-colors hover:bg-background"
            >
              Abbrechen
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm leading-relaxed text-text">
          {statement.content}
        </p>
      )}

      {metaParts.length > 0 && (
        <div className="mt-2 border-t border-border/70 pt-2">
          <div
            className={`text-[13px] text-text-muted ${
              metaCollapsible && !metaExpanded ? "line-clamp-1" : ""
            }`}
          >
            {metaParts.map((part) => (
              <span key={part.label} className="mr-2">
                <span className="font-medium">{part.label}:</span> {part.text}
              </span>
            ))}
          </div>
          {metaCollapsible && (
            <button
              type="button"
              onClick={() => setMetaExpanded((value) => !value)}
              className="mt-0.5 text-xs font-medium text-accent hover:underline"
            >
              {metaExpanded ? "Weniger" : "Mehr"}
            </button>
          )}
        </div>
      )}

      {!statement.adopted && showAdoptAction && (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-accent/20 pt-2.5">
          <span className="text-xs font-medium uppercase tracking-wide text-accent">
            Entwurf
          </span>
          <button
            type="button"
            onClick={() => patch({ adopted: true })}
            disabled={isBusy}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" aria-hidden />
            In Projektstand übernehmen
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-danger-text">{error}</p>}
    </div>
  );
}
