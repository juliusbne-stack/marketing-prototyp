"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import type { StatementData } from "@/components/statements/types";
import { EvidenceBadge } from "@/components/statements/EvidenceBadge";
import { RESULT_CONFIG, type FeedbackData } from "./types";

// Evidence update per tested assumption (UI_KONZEPT §4, phase 5): before→after
// badge, result chip, AI interpretation and a user-confirmed status change.
export function EvidenceUpdateList({
  feedbacks,
  assumptionsById,
  onApplied,
}: {
  feedbacks: FeedbackData[];
  assumptionsById: Map<string, StatementData>;
  onApplied: (feedback: FeedbackData, statement: StatementData) => void;
}) {
  const assessed = feedbacks.filter(
    (feedback) => feedback.interpretation !== null
  );

  if (assessed.length === 0) return null;

  return (
    <section aria-label="Evidenz-Updates" className="flex flex-col gap-3">
      <h3 className="font-heading text-base font-medium text-text">
        Evidenz-Updates
      </h3>
      {assessed.map((feedback) => {
        const assumption = assumptionsById.get(feedback.statementId);
        if (!assumption) return null;
        return (
          <EvidenceUpdateRow
            key={feedback.id}
            feedback={feedback}
            assumption={assumption}
            onApplied={onApplied}
          />
        );
      })}
    </section>
  );
}

function EvidenceUpdateRow({
  feedback,
  assumption,
  onApplied,
}: {
  feedback: FeedbackData;
  assumption: StatementData;
  onApplied: (feedback: FeedbackData, statement: StatementData) => void;
}) {
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resultConfig = RESULT_CONFIG[feedback.result];
  const proposesChange =
    feedback.proposedNewStatus !== null &&
    feedback.proposedNewStatus !== assumption.evidenceStatus;

  async function handleApply() {
    setIsBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: feedback.id, applyStatus: true }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          body?.error ??
            "Die Statusänderung konnte nicht gespeichert werden. Erneut versuchen."
        );
      }
      onApplied(body.feedback, body.statement);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Die Statusänderung konnte nicht gespeichert werden. Erneut versuchen."
      );
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="rounded-[10px] border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${resultConfig.className}`}
        >
          {resultConfig.label}
        </span>
        {feedback.proposedNewStatus ? (
          <span className="inline-flex items-center gap-1.5">
            <EvidenceBadge status={assumption.evidenceStatus} />
            <ArrowRight className="h-3.5 w-3.5 text-text-muted" aria-hidden />
            <EvidenceBadge status={feedback.proposedNewStatus} />
          </span>
        ) : (
          <span className="text-xs text-text-muted">
            Evidenzstatus bleibt unverändert
          </span>
        )}
      </div>

      <p className="mt-2 text-sm leading-relaxed text-text">
        {assumption.content}
      </p>

      {feedback.interpretation && (
        <p className="mt-2 border-t border-border/70 pt-2 text-[13px] text-text-muted">
          <span className="font-medium">KI-Interpretation:</span>{" "}
          {feedback.interpretation}
        </p>
      )}

      {proposesChange && !feedback.statusApplied && (
        <button
          type="button"
          onClick={handleApply}
          disabled={isBusy}
          className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" aria-hidden />
          Statusänderung übernehmen
        </button>
      )}

      {feedback.statusApplied && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-evidence-fact-text">
          <Check className="h-3.5 w-3.5" aria-hidden />
          Statusänderung übernommen
        </p>
      )}

      {error && <p className="mt-2 text-xs text-danger-text">{error}</p>}
    </div>
  );
}
