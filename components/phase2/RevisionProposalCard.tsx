"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { EvidenceBadge } from "@/components/statements/EvidenceBadge";
import { OriginTag } from "@/components/statements/OriginTag";
import type { StatementData } from "@/components/statements/types";
import type { OptionData } from "./types";

// Draft card for an AI revision proposal below the current dimension card
// (revision mode after an ADAPT decision). Adoption swaps the option link
// from the old to the new statement server-side; the old statement is kept.
export function RevisionProposalCard({
  revision,
  optionId,
  oldStatementId,
  onAdopted,
  onDiscarded,
}: {
  revision: StatementData;
  optionId: string;
  oldStatementId: string;
  onAdopted: (option: OptionData, revisionId: string) => void;
  onDiscarded: (revisionId: string) => void;
}) {
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdopt() {
    setIsBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/options/revision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          optionId,
          oldStatementId,
          newStatementId: revision.id,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          body?.error ??
            "Die Übernahme konnte nicht gespeichert werden. Erneut versuchen."
        );
      }
      onAdopted(body, revision.id);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Die Übernahme konnte nicht gespeichert werden. Erneut versuchen."
      );
      setIsBusy(false);
    }
  }

  async function handleDiscard() {
    setIsBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/statements?id=${encodeURIComponent(revision.id)}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        throw new Error(
          "Der Vorschlag konnte nicht verworfen werden. Erneut versuchen."
        );
      }
      onDiscarded(revision.id);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Der Vorschlag konnte nicht verworfen werden. Erneut versuchen."
      );
      setIsBusy(false);
    }
  }

  return (
    <div
      className={`mt-2 rounded-[10px] border border-dashed border-accent/50 bg-accent-soft/40 p-3 ${
        isBusy ? "opacity-60" : ""
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-accent">
        Überarbeitungsvorschlag
      </p>

      <div className="mt-2 flex items-start justify-between gap-3">
        <EvidenceBadge status={revision.evidenceStatus} />
        <OriginTag origin={revision.origin} />
      </div>

      <p className="mt-2 text-sm leading-relaxed text-text">
        {revision.content}
      </p>

      {(revision.justification || revision.uncertainty) && (
        <div className="mt-2 border-t border-accent/20 pt-2 text-[13px] text-text-muted">
          {revision.justification && (
            <p>
              <span className="font-medium">Begründung:</span>{" "}
              {revision.justification}
            </p>
          )}
          {revision.uncertainty && (
            <p className="mt-1">
              <span className="font-medium">Unsicher:</span>{" "}
              {revision.uncertainty}
            </p>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 border-t border-accent/20 pt-2.5">
        <button
          type="button"
          onClick={handleAdopt}
          disabled={isBusy}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" aria-hidden />
          Übernehmen
        </button>
        <button
          type="button"
          onClick={handleDiscard}
          disabled={isBusy}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-text transition-colors hover:bg-background disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
          Verwerfen
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-danger-text">{error}</p>}
    </div>
  );
}
