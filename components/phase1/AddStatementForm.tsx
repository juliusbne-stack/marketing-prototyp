"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { EvidenceStatus, StatementCategory } from "@prisma/client";
import type { StatementData } from "@/components/statements/types";

const EVIDENCE_OPTIONS: { value: EvidenceStatus; label: string }[] = [
  { value: "FACT", label: "Fakt" },
  { value: "ASSUMPTION", label: "Annahme" },
  { value: "OPEN_QUESTION", label: "Offene Frage" },
];

/**
 * "+ Aussage hinzufügen" per section (UI_KONZEPT phase 1, point 4).
 * Manual statements are always origin=USER_INPUT and start as drafts.
 */
export function AddStatementForm({
  projectId,
  categories,
  onAdded,
}: {
  projectId: string;
  categories: { value: StatementCategory; label: string }[];
  onAdded: (statement: StatementData) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<StatementCategory>(
    categories[0].value
  );
  const [evidenceStatus, setEvidenceStatus] =
    useState<EvidenceStatus>("ASSUMPTION");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/statements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          phase: 1,
          category,
          content: content.trim(),
          evidenceStatus,
          origin: "USER_INPUT",
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(
          body?.error ??
            "Die Aussage konnte nicht angelegt werden. Erneut versuchen — deine Eingaben bleiben erhalten."
        );
      }
      const created: StatementData = await response.json();
      onAdded(created);
      setContent("");
      setIsOpen(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Die Aussage konnte nicht angelegt werden. Erneut versuchen — deine Eingaben bleiben erhalten."
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
        className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        Aussage hinzufügen
      </button>
    );
  }

  const inputClasses =
    "w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-text placeholder:text-text-muted";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[10px] border border-dashed border-border bg-surface p-3"
    >
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        rows={2}
        autoFocus
        placeholder="Eigene Aussage formulieren …"
        aria-label="Inhalt der Aussage"
        className={inputClasses}
        disabled={isSubmitting}
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {categories.length > 1 && (
          <select
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as StatementCategory)
            }
            aria-label="Bereich"
            className="rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-text"
            disabled={isSubmitting}
          >
            {categories.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
        <select
          value={evidenceStatus}
          onChange={(event) =>
            setEvidenceStatus(event.target.value as EvidenceStatus)
          }
          aria-label="Evidenzstatus"
          className="rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-text"
          disabled={isSubmitting}
        >
          {EVIDENCE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={isSubmitting || !content.trim()}
          className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
        >
          {isSubmitting ? "Wird angelegt …" : "Hinzufügen"}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setContent("");
            setError(null);
          }}
          disabled={isSubmitting}
          className="rounded-md border border-border px-3 py-1.5 text-xs text-text transition-colors hover:bg-background"
        >
          Abbrechen
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-danger-text">{error}</p>}
    </form>
  );
}
