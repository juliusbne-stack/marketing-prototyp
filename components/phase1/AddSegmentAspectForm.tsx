"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { EvidenceStatus } from "@prisma/client";
import type { StatementData } from "@/components/statements/types";
import {
  SEGMENT_ASPECTS,
  SEGMENT_ASPECT_LABELS,
  type SegmentAspect,
} from "@/lib/segmentAspects";

const EVIDENCE_OPTIONS: { value: EvidenceStatus; label: string }[] = [
  { value: "FACT", label: "Fakt" },
  { value: "ASSUMPTION", label: "Annahme" },
  { value: "OPEN_QUESTION", label: "Offene Frage" },
];

/** Manual TARGET_SEGMENT statement for a specific segment profile dimension. */
export function AddSegmentAspectForm({
  projectId,
  segmentLabel,
  existingAspects,
  onAdded,
  open,
  onOpenChange,
  hideTrigger = false,
}: {
  projectId: string;
  segmentLabel: string;
  existingAspects: SegmentAspect[];
  onAdded: (statement: StatementData) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}) {
  const availableAspects = SEGMENT_ASPECTS.filter(
    (aspect) => !existingAspects.includes(aspect)
  );

  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setIsOpen = onOpenChange ?? setInternalOpen;
  const [content, setContent] = useState("");
  const [segmentAspect, setSegmentAspect] = useState<SegmentAspect>(
    availableAspects[0] ?? "WHO_CORE"
  );
  const selectedAspect = availableAspects.includes(segmentAspect)
    ? segmentAspect
    : availableAspects[0];
  const [evidenceStatus, setEvidenceStatus] =
    useState<EvidenceStatus>("ASSUMPTION");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (availableAspects.length === 0) return null;

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
          category: "TARGET_SEGMENT",
          content: content.trim(),
          evidenceStatus,
          origin: "USER_INPUT",
          segmentLabel,
          segmentAspect: selectedAspect,
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
    if (hideTrigger) return null;
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        Aspekt ergänzen
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
        placeholder="Aussage zu dieser Segmentdimension formulieren …"
        aria-label="Inhalt der Aussage"
        className={inputClasses}
        disabled={isSubmitting}
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select
          value={selectedAspect}
          onChange={(event) =>
            setSegmentAspect(event.target.value as SegmentAspect)
          }
          aria-label="Segmentdimension"
          className="rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-text"
          disabled={isSubmitting}
        >
          {availableAspects.map((aspect) => (
            <option key={aspect} value={aspect}>
              {SEGMENT_ASPECT_LABELS[aspect]}
            </option>
          ))}
        </select>
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
          className="btn-primary btn-primary--sm"
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
