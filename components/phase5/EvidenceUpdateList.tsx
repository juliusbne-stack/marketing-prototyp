"use client";

import { useState } from "react";
import { ArrowRight, Check, ChevronDown } from "lucide-react";
import type { StatementData } from "@/components/statements/types";
import { EvidenceBadge } from "@/components/statements/EvidenceBadge";
import { CATEGORY_LABELS } from "@/components/statements/categoryLabels";
import { CollapsibleSection } from "@/components/wizard/CollapsibleSection";
import { RESULT_CONFIG, type FeedbackData } from "./types";
import type { StepWithAssumption } from "@/components/phase4/types";

// Evidence updates grouped per tested assumption (UI_KONZEPT §4, phase 5):
// ONE row per statement bundling all assessed, not-yet-processed feedbacks.
// The row carries ONE consolidated status proposal (taken from the newest
// assessment, which factors in the full validation history). "Vorher" is
// always the CURRENT evidenceStatus of the statement — never a snapshot.
// Applying the proposal marks ALL bundled feedbacks as processed.
type UpdateGroup = {
  statement: StatementData;
  // Chronological (oldest step first); the last entry is the newest.
  feedbacks: FeedbackData[];
};

export function EvidenceUpdateList({
  feedbacks,
  assumptionsById,
  steps,
  previousRunStepIds,
  onApplied,
}: {
  feedbacks: FeedbackData[];
  assumptionsById: Map<string, StatementData>;
  steps: StepWithAssumption[];
  previousRunStepIds: string[];
  onApplied: (feedbacks: FeedbackData[], statement: StatementData) => void;
}) {
  const assessed = feedbacks.filter(
    (feedback) => feedback.interpretation !== null
  );

  if (assessed.length === 0) return null;

  const previousRun = new Set(previousRunStepIds);
  const stepsById = new Map(steps.map((step) => [step.id, step]));
  const stepOrder = new Map(steps.map((step, index) => [step.id, index]));
  const orderOf = (feedback: FeedbackData) =>
    feedback.stepId != null ? (stepOrder.get(feedback.stepId) ?? -1) : -1;

  // Open = not yet applied AND tied to a step of the current (open) run.
  // Applied updates and updates of previous-run steps count as done.
  const isDone = (feedback: FeedbackData) =>
    feedback.statusApplied ||
    feedback.stepId === null ||
    previousRun.has(feedback.stepId);

  const buildGroups = (list: FeedbackData[]): UpdateGroup[] => {
    const byStatement = new Map<string, FeedbackData[]>();
    for (const feedback of list) {
      byStatement.set(feedback.statementId, [
        ...(byStatement.get(feedback.statementId) ?? []),
        feedback,
      ]);
    }

    const groups: UpdateGroup[] = [];
    for (const [statementId, groupFeedbacks] of byStatement) {
      const statement = assumptionsById.get(statementId);
      if (!statement) continue;
      groups.push({
        statement,
        feedbacks: [...groupFeedbacks].sort((a, b) => orderOf(a) - orderOf(b)),
      });
    }

    // Actionable proposals first, then newest tested assumption on top.
    const proposesChange = (group: UpdateGroup) => {
      const proposal = group.feedbacks[group.feedbacks.length - 1]
        .proposedNewStatus;
      return proposal !== null && proposal !== group.statement.evidenceStatus;
    };
    return groups.sort((a, b) => {
      const aActionable = proposesChange(a);
      const bActionable = proposesChange(b);
      if (aActionable !== bActionable) return aActionable ? -1 : 1;
      return (
        orderOf(b.feedbacks[b.feedbacks.length - 1]) -
        orderOf(a.feedbacks[a.feedbacks.length - 1])
      );
    });
  };

  const openGroups = buildGroups(assessed.filter((feedback) => !isDone(feedback)));
  const doneGroups = buildGroups(assessed.filter(isDone));

  return (
    <section aria-label="Evidenz-Updates" className="flex flex-col gap-3">
      <h3 className="font-heading text-base font-medium text-text">
        Evidenz-Updates
      </h3>

      {openGroups.length > 0 ? (
        openGroups.map((group) => (
          <EvidenceUpdateGroupRow
            key={group.statement.id}
            group={group}
            stepsById={stepsById}
            compact={false}
            onApplied={onApplied}
          />
        ))
      ) : (
        <p className="text-sm text-text-muted">
          Keine offenen Evidenz-Updates — alle Statusvorschläge des aktuellen
          Durchlaufs sind übernommen.
        </p>
      )}

      {doneGroups.length > 0 && (
        <CollapsibleSection
          title={`Erledigte Evidenz-Updates (${doneGroups.length})`}
          intro="Bereits übernommene Statusänderungen und Updates zu Schritten des vorherigen Durchlaufs."
          defaultOpen={false}
        >
          <div className="flex flex-col gap-3">
            {doneGroups.map((group) => (
              <EvidenceUpdateGroupRow
                key={group.statement.id}
                group={group}
                stepsById={stepsById}
                compact
                onApplied={onApplied}
              />
            ))}
          </div>
        </CollapsibleSection>
      )}
    </section>
  );
}

function EvidenceUpdateGroupRow({
  group,
  stepsById,
  compact,
  onApplied,
}: {
  group: UpdateGroup;
  stepsById: Map<string, StepWithAssumption>;
  compact: boolean;
  onApplied: (feedbacks: FeedbackData[], statement: StatementData) => void;
}) {
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { statement } = group;
  // Consolidated proposal: the newest assessment already factors in the full
  // validation history of the statement (see lib/prompts/phase5.ts).
  const newest = group.feedbacks[group.feedbacks.length - 1];
  const proposal = newest.proposedNewStatus;
  const proposesChange =
    proposal !== null && proposal !== statement.evidenceStatus;
  const anyApplied = group.feedbacks.some((feedback) => feedback.statusApplied);

  async function handleApply() {
    setIsBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: newest.id,
          applyStatus: true,
          bundledIds: group.feedbacks
            .filter((feedback) => feedback.id !== newest.id)
            .map((feedback) => feedback.id),
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          body?.error ??
            "Die Statusänderung konnte nicht gespeichert werden. Erneut versuchen."
        );
      }
      onApplied(body.feedbacks, body.statement);
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
    <div
      className={
        compact
          ? "rounded-[10px] border border-border/80 bg-background px-4 py-3"
          : "rounded-[10px] border border-border bg-surface p-4"
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-text-muted">
          {CATEGORY_LABELS[statement.category]}
        </span>
        {!compact &&
          (proposesChange ? (
            <span className="inline-flex items-center gap-1.5">
              <EvidenceBadge status={statement.evidenceStatus} />
              <ArrowRight className="h-3.5 w-3.5 text-text-muted" aria-hidden />
              <EvidenceBadge status={proposal} />
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
              Status bleibt:
              <EvidenceBadge status={statement.evidenceStatus} />
            </span>
          ))}
        {compact && <EvidenceBadge status={statement.evidenceStatus} />}
      </div>

      <p className="mt-2 text-sm leading-relaxed text-text">
        {statement.content}
      </p>

      <ul className="mt-3 flex flex-col gap-1.5">
        {group.feedbacks.map((feedback) => (
          <FeedbackAssessmentItem
            key={feedback.id}
            feedback={feedback}
            stepTitle={
              feedback.stepId
                ? (stepsById.get(feedback.stepId)?.title ?? null)
                : null
            }
          />
        ))}
      </ul>

      {proposesChange && !anyApplied && !compact && (
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

      {anyApplied && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-evidence-fact-text">
          <Check className="h-3.5 w-3.5" aria-hidden />
          Statusänderung übernommen
        </p>
      )}

      {error && <p className="mt-2 text-xs text-danger-text">{error}</p>}
    </div>
  );
}

// One assessed feedback inside a group: result chip, step title and the
// interpretation as a single line, expandable to the full text.
function FeedbackAssessmentItem({
  feedback,
  stepTitle,
}: {
  feedback: FeedbackData;
  stepTitle: string | null;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const resultConfig = RESULT_CONFIG[feedback.result];

  return (
    <li className="rounded-md border border-border/70 bg-background/60 px-3 py-2">
      <button
        type="button"
        onClick={() => setIsExpanded((current) => !current)}
        aria-expanded={isExpanded}
        className="flex w-full items-center gap-2 text-left"
      >
        <span
          className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${resultConfig.className}`}
        >
          {resultConfig.label}
        </span>
        {stepTitle && (
          <span className="min-w-0 truncate text-xs font-medium text-text">
            {stepTitle}
          </span>
        )}
        <ChevronDown
          className={`ml-auto h-3.5 w-3.5 shrink-0 text-text-muted transition-transform motion-reduce:transition-none ${
            isExpanded ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>
      {feedback.interpretation && (
        <p
          className={`mt-1 text-[13px] text-text-muted ${
            isExpanded ? "" : "truncate"
          }`}
        >
          {feedback.interpretation}
        </p>
      )}
    </li>
  );
}
