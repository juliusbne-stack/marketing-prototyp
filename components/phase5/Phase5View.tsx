"use client";

import { useState } from "react";
import { Sparkles, Star } from "lucide-react";
import { ProgressButton } from "@/components/ui/ProgressButton";
import type { PrioritizedOptionData, StepWithAssumption } from "@/components/phase4/types";
import type { StatementData } from "@/components/statements/types";
import { StatementCard } from "@/components/statements/StatementCard";
import { CollapsibleSection } from "@/components/wizard/CollapsibleSection";
import { AdaptationPanel } from "./AdaptationPanel";
import { EvidenceUpdateList } from "./EvidenceUpdateList";
import { FeedbackForm } from "./FeedbackForm";
import {
  PhaseEmptyState,
  PhaseErrorState,
  PhaseLoadingState,
} from "@/components/wizard/phaseStates";
import { isStepCompleted } from "@/lib/validation";
import type {
  AdaptationData,
  AdaptationProposal,
  EvidenceBalance,
  FeedbackData,
} from "./types";

export function Phase5View({
  projectId,
  option,
  initialSteps,
  initialFeedbacks,
  initialLearnings,
  initialDecision,
  previousRunStepIds,
  kpiSummaries = {},
}: {
  projectId: string;
  option: PrioritizedOptionData | null;
  initialSteps: StepWithAssumption[];
  initialFeedbacks: FeedbackData[];
  initialLearnings: StatementData[];
  initialDecision: AdaptationData | null;
  // Steps created before the latest confirmed adaptation decision — their
  // evidence updates belong to the previous run (computed server-side).
  previousRunStepIds: string[];
  // LLM-free summaries of the cockpit KPI data per step (only steps with data).
  kpiSummaries?: Record<string, string>;
}) {
  const [steps, setSteps] = useState(initialSteps);
  const [feedbacks, setFeedbacks] = useState(initialFeedbacks);
  const [learnings, setLearnings] = useState(initialLearnings);
  const [decision, setDecision] = useState(initialDecision);
  const [proposal, setProposal] = useState<AdaptationProposal | null>(null);
  const [evidenceBalance, setEvidenceBalance] =
    useState<EvidenceBalance | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasFeedback = feedbacks.length > 0;
  const hasAssessments = feedbacks.some(
    (feedback) => feedback.interpretation !== null
  );

  const openSteps = steps.filter(
    (step) => !isStepCompleted(step.id, feedbacks)
  );
  const completedSteps = steps.filter((step) =>
    isStepCompleted(step.id, feedbacks)
  );

  async function handleEvaluate() {
    setIsEvaluating(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/5", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          body?.error ??
            "Die KI-Antwort konnte nicht verarbeitet werden. Erneut versuchen — deine Rückmeldungen bleiben erhalten."
        );
      }
      setFeedbacks(body.feedbacks);
      setLearnings(body.newStatements);
      setProposal(body.adaptation);
      setEvidenceBalance(body.evidenceBalance ?? null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Die KI-Antwort konnte nicht verarbeitet werden. Erneut versuchen — deine Rückmeldungen bleiben erhalten."
      );
    } finally {
      setIsEvaluating(false);
    }
  }

  function handleFeedbackSaved(saved: FeedbackData) {
    setFeedbacks((current) => {
      const exists = current.some((feedback) => feedback.id === saved.id);
      return exists
        ? current.map((feedback) => (feedback.id === saved.id ? saved : feedback))
        : [...current, saved];
    });
  }

  function handleStatusApplied(
    appliedFeedbacks: FeedbackData[],
    statement: StatementData
  ) {
    for (const feedback of appliedFeedbacks) {
      handleFeedbackSaved(feedback);
    }
    setSteps((current) =>
      current.map((step) =>
        step.assumptionId === statement.id
          ? { ...step, assumption: statement }
          : step
      )
    );
  }

  function handleLearningChanged(updated: StatementData) {
    setLearnings((current) =>
      current.map((statement) =>
        statement.id === updated.id ? updated : statement
      )
    );
  }

  function handleLearningDeleted(id: string) {
    setLearnings((current) => current.filter((statement) => statement.id !== id));
  }

  if (!option || steps.length === 0) {
    return (
      <PhaseEmptyState>
        In dieser Phase erfasst du Marktrückmeldungen zu deinen
        Umsetzungsschritten und entscheidest über die strategische Anpassung.
        Übernimm zuerst in Phase 4 mindestens einen Umsetzungsschritt in den
        Projektstand.
      </PhaseEmptyState>
    );
  }

  const assumptionsById = new Map(
    steps.map((step) => [step.assumption.id, step.assumption])
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-[10px] border-2 border-accent bg-surface p-4">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
          <Star className="h-3.5 w-3.5" aria-hidden />
          Priorisierte Option
        </p>
        <h4 className="mt-2 font-heading text-base font-medium text-text">
          {option.title}
        </h4>
        {option.summary && (
          <p className="mt-1 text-sm text-text-muted">{option.summary}</p>
        )}
      </div>

      <section aria-label="Marktrückmeldungen" className="flex flex-col gap-3">
        <div>
          <h3 className="font-heading text-base font-medium text-text">
            Marktrückmeldungen erfassen
          </h3>
          <p className="mt-1 text-sm text-text-muted">
            Trage je Umsetzungsschritt ein, was (fiktiv) passiert ist — bewertet
            wird gegen die vorab festgelegten Messpunkte.
          </p>
        </div>

        {openSteps.length > 0 && (
          <div className="flex flex-col gap-3">
            {openSteps.map((step) => (
              <FeedbackForm
                key={step.id}
                projectId={projectId}
                step={step}
                feedback={
                  feedbacks.find((feedback) => feedback.stepId === step.id) ?? null
                }
                kpiSummary={kpiSummaries[step.id] ?? null}
                onSaved={handleFeedbackSaved}
              />
            ))}
          </div>
        )}

        {completedSteps.length > 0 && (
          <CollapsibleSection
            title={`Abgeschlossene Auswertungen (${completedSteps.length})`}
            intro="Optional: Trage nach, falls dich weitere Rückmeldungen zu bereits geprüften Annahmen erreichen."
            defaultOpen={false}
          >
            <div className="flex flex-col gap-3">
              {completedSteps.map((step) => (
                <FeedbackForm
                  key={step.id}
                  projectId={projectId}
                  step={step}
                  feedback={
                    feedbacks.find((feedback) => feedback.stepId === step.id) ?? null
                  }
                  kpiSummary={kpiSummaries[step.id] ?? null}
                  onSaved={handleFeedbackSaved}
                />
              ))}
            </div>
          </CollapsibleSection>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-border bg-surface px-4 py-3">
        <p className="text-sm text-text-muted">
          {hasAssessments
            ? "Erneutes Auswerten ersetzt die bisherige Interpretation und erzeugt einen neuen Vorschlag."
            : hasFeedback
              ? "Die KI verknüpft die Rückmeldungen mit den geprüften Annahmen und schlägt Evidenz-Updates vor."
              : "Erfasse zuerst mindestens eine Rückmeldung."}
        </p>
        <ProgressButton
          type="button"
          onClick={handleEvaluate}
          loading={isEvaluating}
          disabled={!hasFeedback}
          loadingLabel="Auswertung läuft …"
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          {hasAssessments
            ? "Rückmeldungen erneut auswerten"
            : "Rückmeldungen auswerten"}
        </ProgressButton>
      </div>

      {error && <PhaseErrorState message={error} />}

      {isEvaluating && <PhaseLoadingState phase={5} variant="step" />}

      {!isEvaluating && !hasAssessments && (
        <PhaseEmptyState>
          {hasFeedback
            ? "Die Rückmeldungen sind erfasst. Starte mit „Rückmeldungen auswerten“ — die KI schlägt Evidenz-Updates und eine Anpassungsentscheidung vor."
            : "Trage je Umsetzungsschritt ein, was (fiktiv) passiert ist, und starte dann mit „Rückmeldungen auswerten“."}
        </PhaseEmptyState>
      )}

      {!isEvaluating && hasAssessments && (
        <EvidenceUpdateList
          feedbacks={feedbacks}
          assumptionsById={assumptionsById}
          steps={steps}
          previousRunStepIds={previousRunStepIds}
          onApplied={handleStatusApplied}
        />
      )}

      {!isEvaluating && learnings.length > 0 && (
        <section aria-label="Neue Erkenntnisse" className="flex flex-col gap-3">
          <div>
            <h3 className="font-heading text-base font-medium text-text">
              Neue Erkenntnisse & offene Fragen
            </h3>
            <p className="mt-1 text-sm text-text-muted">
              Aus den Rückmeldungen abgeleitet — übernimm, was in den
              Projektstand einfließen soll.
            </p>
          </div>
          {learnings.map((statement) => (
            <StatementCard
              key={statement.id}
              statement={statement}
              onChanged={handleLearningChanged}
              onDeleted={handleLearningDeleted}
            />
          ))}
        </section>
      )}

      {!isEvaluating && (proposal || decision) && (
        <AdaptationPanel
          key={proposal ? proposal.rationale : "persisted"}
          projectId={projectId}
          optionId={option.id}
          proposal={proposal}
          evidenceBalance={evidenceBalance}
          decision={decision}
          onConfirmed={setDecision}
        />
      )}
    </div>
  );
}
