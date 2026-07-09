"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  CircleCheck,
  CircleX,
  LoaderCircle,
  Radio,
  Sparkles,
} from "lucide-react";
import type { Phase4RefineValidationResponse } from "@/lib/schemas/phase4RefineValidation";
import { EvidenceBadge } from "@/components/statements/EvidenceBadge";
import { StepImplementationFrame } from "@/components/steps/StepImplementationFrame";
import type { StatementData } from "@/components/statements/types";
import type { StepData } from "./types";

type RefinementRound = {
  feedback: string;
  resultTitle: string;
};

type RefinementMeta = {
  stepAdopted: boolean;
  hasDependents: boolean;
  requiresReplacement: boolean;
};

// Dialogic refinement for one validation block (assumption + step + metrics).
// Preview-first — nothing is persisted until the user adopts the proposal.
export function ValidationRefinementPanel({
  projectId,
  step,
  assumption,
  onAdopted,
  onClose,
}: {
  projectId: string;
  step: StepData;
  assumption: StatementData;
  onAdopted: (result: {
    step: StepData;
    assumption: StatementData;
    archivedStepId: string | null;
  }) => void;
  onClose: () => void;
}) {
  const [userInstruction, setUserInstruction] = useState("");
  const [rounds, setRounds] = useState<RefinementRound[]>([]);
  const [proposal, setProposal] = useState<Phase4RefineValidationResponse | null>(
    null
  );
  const [meta, setMeta] = useState<RefinementMeta | null>(null);
  const [lastInstruction, setLastInstruction] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [isAdopting, setIsAdopting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const instructionRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isRefining || proposal) return;
    const timeout = window.setTimeout(() => {
      instructionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      instructionRef.current?.focus({ preventScroll: true });
    }, 100);
    return () => window.clearTimeout(timeout);
  }, [isRefining, proposal]);

  async function handleRefine() {
    if (!userInstruction.trim()) return;
    setIsRefining(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/4/refine-validation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          statementId: assumption.id,
          validationStepId: step.id,
          userInstruction: userInstruction.trim(),
          previousRefinementRounds: rounds,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          body?.error ??
            "Die KI-Antwort konnte nicht verarbeitet werden. Erneut versuchen — der bisherige Entwurf bleibt erhalten."
        );
      }
      setProposal(body.proposal);
      setMeta(body.meta);
      setLastInstruction(userInstruction.trim());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Die KI-Antwort konnte nicht verarbeitet werden. Erneut versuchen — der bisherige Entwurf bleibt erhalten."
      );
    } finally {
      setIsRefining(false);
    }
  }

  async function handleAdopt() {
    if (!proposal) return;
    setIsAdopting(true);
    setError(null);
    try {
      const response = await fetch("/api/steps/adopt-refinement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepId: step.id, proposal }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          body?.error ??
            "Die Überarbeitung konnte nicht übernommen werden. Erneut versuchen."
        );
      }
      onAdopted({
        step: { ...step, ...body.step },
        assumption: body.assumption,
        archivedStepId: body.archivedStepId ?? null,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Die Überarbeitung konnte nicht übernommen werden. Erneut versuchen."
      );
      setIsAdopting(false);
    }
  }

  function handleRefineAgain() {
    if (!proposal) return;
    setRounds((current) => [
      ...current,
      {
        feedback: lastInstruction,
        resultTitle: proposal.revisedValidationStep.title,
      },
    ]);
    setProposal(null);
    setMeta(null);
    setUserInstruction("");
  }

  return (
    <div className="rounded-[10px] border border-accent/40 bg-accent-soft/30 p-4">
      <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        Mit KI überarbeiten
      </p>

      {isRefining ? (
        <div aria-live="polite" aria-busy="true" className="mt-3">
          <p className="inline-flex items-center gap-2 text-sm text-text-muted">
            <LoaderCircle className="h-4 w-4 animate-spin text-accent" aria-hidden />
            Die KI überarbeitet Aussage und Umsetzungsschritt …
          </p>
          <div className="mt-3 h-32 animate-pulse rounded-[10px] border border-border bg-surface">
            <div className="m-4 h-3 w-1/3 rounded bg-border" />
            <div className="mx-4 h-3 w-3/4 rounded bg-border/60" />
            <div className="m-4 h-8 rounded bg-border/40" />
          </div>
        </div>
      ) : proposal ? (
        <div className="mt-3 flex flex-col gap-3">
          {meta?.requiresReplacement && (
            <p className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs leading-relaxed text-amber-900">
              Diese Validierung ist bereits übernommen und kann mit Aufgaben,
              Kennzahlen oder Rückmeldungen verknüpft sein. Eine Änderung kann
              spätere Auswertungen beeinflussen. Der bisherige Schritt wird als
              nicht weiter verfolgt markiert; die überarbeitete Version erscheint
              als neuer Entwurf.
            </p>
          )}

          <div className="rounded-[10px] border border-dashed border-accent/50 bg-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Überarbeitete Aussage
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <EvidenceBadge status={proposal.revisedStatement.evidenceStatus} />
            </div>
            <p className="mt-2 text-sm leading-relaxed text-text">
              {proposal.revisedStatement.content}
            </p>
            {proposal.revisedStatement.justification && (
              <p className="mt-2 text-xs text-text-muted">
                {proposal.revisedStatement.justification}
              </p>
            )}
            {proposal.revisedStatement.uncertainty && (
              <p className="mt-1 text-xs text-text-muted">
                Unsicherheit: {proposal.revisedStatement.uncertainty}
              </p>
            )}

            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-text-muted">
              Überarbeiteter Validierungsschritt
            </p>
            {proposal.revisedValidationStep.validationQuestion && (
              <p className="mt-2 text-sm text-text">
                <span className="font-medium">Prüffrage:</span>{" "}
                {proposal.revisedValidationStep.validationQuestion}
              </p>
            )}
            {proposal.revisedValidationStep.testDesign && (
              <p className="mt-2 text-sm text-text">
                <span className="font-medium">Testdesign:</span>{" "}
                {proposal.revisedValidationStep.testDesign}
              </p>
            )}
            <h5 className="mt-2 font-heading text-sm font-medium text-text">
              {proposal.revisedValidationStep.title}
            </h5>
            <StepImplementationFrame
              timeframe={proposal.revisedValidationStep.timeframe}
              budgetFrame={proposal.revisedValidationStep.budgetFrame}
              readOnly
            />
            {proposal.revisedValidationStep.channel && (
              <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">
                <Radio className="h-3 w-3" aria-hidden />
                {proposal.revisedValidationStep.channel}
              </span>
            )}
            <p className="mt-2 text-sm leading-relaxed text-text">
              {proposal.revisedValidationStep.description}
            </p>
            {proposal.revisedValidationStep.marketingActivities.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1">
                {proposal.revisedValidationStep.marketingActivities.map(
                  (activity) => (
                    <li key={activity} className="text-sm text-text-muted">
                      • {activity}
                    </li>
                  )
                )}
              </ul>
            )}

            <div className="mt-3 flex flex-col gap-2">
              {proposal.revisedMetrics.map((metric, index) => (
                <div key={index}>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-medium text-text">{metric.name}</p>
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-text-muted">
                      {metric.metricRole === "DECISIVE"
                        ? "Entscheidend"
                        : "Unterstützend"}
                    </span>
                  </div>
                  <div className="mt-1 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-md bg-evidence-fact-bg p-2.5">
                      <p className="inline-flex items-start gap-1.5 text-xs leading-relaxed text-evidence-fact-text">
                        <CircleCheck
                          className="mt-0.5 h-3.5 w-3.5 shrink-0"
                          aria-hidden
                        />
                        <span>
                          <span className="font-semibold">Stützend wenn:</span>{" "}
                          {metric.successCriterion}
                        </span>
                      </p>
                    </div>
                    <div className="rounded-md bg-danger-bg p-2.5">
                      <p className="inline-flex items-start gap-1.5 text-xs leading-relaxed text-danger-text">
                        <CircleX
                          className="mt-0.5 h-3.5 w-3.5 shrink-0"
                          aria-hidden
                        />
                        <span>
                          <span className="font-semibold">Widerlegend wenn:</span>{" "}
                          {metric.failureCriterion}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-3 rounded-md bg-accent-soft p-2.5 text-xs leading-relaxed text-accent">
              <span className="font-semibold">Begründung:</span> {proposal.rationale}
            </p>
            {proposal.strategyAdjustmentHint && (
              <p className="mt-2 rounded-md border border-border bg-background p-2.5 text-xs leading-relaxed text-text-muted">
                <span className="font-semibold">Strategiehinweis:</span>{" "}
                {proposal.strategyAdjustmentHint}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleAdopt}
              disabled={isAdopting}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" aria-hidden />
              Überarbeitung übernehmen
            </button>
            <button
              type="button"
              onClick={handleRefineAgain}
              disabled={isAdopting}
              className="inline-flex items-center gap-1.5 rounded-md border border-accent px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent-soft disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Nochmals überarbeiten
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isAdopting}
              className="rounded-md border border-border px-3 py-1.5 text-xs text-text transition-colors hover:bg-background disabled:opacity-50"
            >
              Verwerfen
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {rounds.length > 0 && (
            <p className="text-xs text-text-muted">
              Bisherige Überarbeitungsrunden ({rounds.length}) werden bei der
              nächsten Anfrage weiter berücksichtigt.
            </p>
          )}
          <label className="block text-xs font-medium text-text">
            Was soll an dieser Validierung geändert werden?
            <textarea
              ref={instructionRef}
              value={userInstruction}
              onChange={(event) => setUserInstruction(event.target.value)}
              rows={3}
              placeholder="z. B. Annahme präziser formulieren, anderes Experiment vorschlagen, Budget senken, Metriken konkreter machen …"
              className="mt-1 w-full rounded-md border border-border bg-surface p-2 text-sm text-text"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleRefine}
              disabled={!userInstruction.trim()}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Überarbeiten
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-3 py-1.5 text-xs text-text transition-colors hover:bg-background"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs text-danger-text">
          {error}
        </p>
      )}
    </div>
  );
}
