"use client";

import { useState } from "react";
import { Check, ChevronRight, Pencil, Trash2 } from "lucide-react";
import type { ValidationHistoryCounts } from "@/lib/validation";
import { EvidenceBadge } from "@/components/statements/EvidenceBadge";
import { OriginTag } from "@/components/statements/OriginTag";
import type { StatementData } from "@/components/statements/types";
import { ValidationHistoryChip } from "@/components/statements/ValidationHistoryChip";

export function CompactStatementRow({
  statement,
  aspectLabel,
  showOriginInline = false,
  validationHistory,
  onChanged,
  onDeleted,
  emptyPlaceholder,
  layout = "row",
}: {
  statement?: StatementData;
  aspectLabel?: string;
  showOriginInline?: boolean;
  validationHistory?: ValidationHistoryCounts | null;
  onChanged?: (statement: StatementData) => void;
  onDeleted?: (id: string) => void;
  emptyPlaceholder?: string;
  layout?: "row" | "column";
}) {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftContent, setDraftContent] = useState(statement?.content ?? "");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!statement) {
    return (
      <div className={`min-w-0 ${layout === "column" ? "py-2" : "py-3"}`}>
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
            {aspectLabel && (
              <span className="w-[7.5rem] shrink-0 pt-0.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
                {aspectLabel}
              </span>
            )}
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

  const labelClasses =
    "text-xs font-semibold uppercase tracking-wide text-text-muted";
  const rowPadding = layout === "column" ? "py-2" : "py-3";

  return (
    <div className={`min-w-0 ${rowPadding} ${isBusy ? "opacity-60" : ""}`}>
      <div className="flex min-w-0 items-start gap-1.5">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-label={expanded ? "Zeile einklappen" : "Zeile aufklappen"}
          className="mt-0.5 shrink-0 rounded p-0.5 text-text-muted transition-colors hover:text-accent"
        >
          <ChevronRight
            className={`h-4 w-4 transition-transform ${expanded ? "rotate-90" : ""}`}
            aria-hidden
          />
        </button>

        <div className="min-w-0 flex-1">
          {layout === "column" ? (
            <div className="flex min-w-0 flex-col gap-1.5">
              {aspectLabel && <span className={labelClasses}>{aspectLabel}</span>}
              <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                <p className="min-w-0 break-words text-sm leading-relaxed text-text">
                  {row.content}
                </p>
                <span className="inline-flex shrink-0 flex-wrap items-center gap-1.5">
                  {showOriginInline && <OriginTag origin={row.origin} />}
                  <EvidenceBadge
                    status={row.evidenceStatus}
                    onChange={(status) => patch({ evidenceStatus: status })}
                    disabled={isBusy}
                  />
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              {aspectLabel && (
                <span
                  className={`w-[7.5rem] shrink-0 pt-0.5 ${labelClasses}`}
                >
                  {aspectLabel}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                  <p className="text-sm leading-relaxed text-text">
                    {row.content}
                  </p>
                  <span className="inline-flex shrink-0 flex-wrap items-center gap-1.5">
                    {showOriginInline && <OriginTag origin={row.origin} />}
                    <EvidenceBadge
                      status={row.evidenceStatus}
                      onChange={(status) => patch({ evidenceStatus: status })}
                      disabled={isBusy}
                    />
                  </span>
                </div>
              </div>
            </div>
          )}

          {expanded && (
            <div
              className={`mt-3 border-t border-border/70 pt-3 ${
                layout === "column" ? "" : "pl-5"
              }`}
            >
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
                      className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
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

                  {!row.adopted && (
                    <button
                      type="button"
                      onClick={() => patch({ adopted: true })}
                      disabled={isBusy}
                      className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden />
                      Einzeln übernehmen
                    </button>
                  )}
                </div>
              )}

              {error && <p className="mt-2 text-xs text-danger-text">{error}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
