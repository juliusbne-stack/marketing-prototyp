"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import type { AdaptationType } from "@prisma/client";
import {
  ADAPTATION_LABELS,
  ADAPTATION_ORDER,
  type AdaptationData,
  type AdaptationProposal,
} from "./types";

// Adaptation decision (UI_KONZEPT §4, phase 5): the AI proposal is shown, the
// USER decides via radio selection + confirmation (F9/NF3). LOOP_BACK renders
// a jump link back into the target phase.
export function AdaptationPanel({
  projectId,
  optionId,
  proposal,
  decision,
  onConfirmed,
}: {
  projectId: string;
  optionId: string;
  proposal: AdaptationProposal | null;
  decision: AdaptationData | null;
  onConfirmed: (decision: AdaptationData) => void;
}) {
  const [isRevising, setIsRevising] = useState(false);
  const [selected, setSelected] = useState<AdaptationType | null>(
    proposal?.decision ?? null
  );
  const [loopBackPhase, setLoopBackPhase] = useState<number>(
    proposal?.loopBackToPhase ?? 2
  );
  const [rationale, setRationale] = useState(proposal?.rationale ?? "");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!selected || !rationale.trim()) return;
    setIsBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/adaptation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          optionId,
          decision: selected,
          rationale: rationale.trim(),
          loopBackToPhase: selected === "LOOP_BACK" ? loopBackPhase : null,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          body?.error ??
            "Die Entscheidung konnte nicht gespeichert werden. Erneut versuchen."
        );
      }
      onConfirmed(body);
      setIsRevising(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Die Entscheidung konnte nicht gespeichert werden. Erneut versuchen."
      );
    } finally {
      setIsBusy(false);
    }
  }

  // A confirmed decision exists and is not being revised: show it.
  if (decision && !isRevising) {
    const label =
      decision.decision === "LOOP_BACK" && decision.loopBackToPhase
        ? `Zurück zu Phase ${decision.loopBackToPhase}`
        : ADAPTATION_LABELS[decision.decision];
    // Context-dependent next step after the confirmed decision, so the user
    // knows how the process continues (loop-back decisions keep the evidence).
    const nextStep: { hint: string; targetPhase: number; cta: string } | null =
      decision.decision === "ADAPT"
        ? {
            hint: "Überarbeite die priorisierte Option in Phase 2. Der Evidenzstand bleibt erhalten — der nächste Durchlauf baut auf dem bisherigen Stand auf.",
            targetPhase: 2,
            cta: "Option in Phase 2 überarbeiten",
          }
        : decision.decision === "DEFER" || decision.decision === "DISCARD"
          ? {
              hint: "Die zurückgestellten Optionen sind in Phase 3 weiterhin verfügbar. Der Evidenzstand bleibt erhalten — der nächste Durchlauf baut auf dem bisherigen Stand auf.",
              targetPhase: 3,
              cta: "Andere Option in Phase 3 priorisieren",
            }
          : decision.decision === "CONTINUE"
            ? {
                hint: "Dieser Strategiedurchlauf ist abgeschlossen. Deine Erkenntnisse und der Evidenzstand bleiben erhalten.",
                targetPhase: 1,
                cta: "Zurück zur Situationsanalyse (neuer Durchlauf)",
              }
            : null;
    return (
      <section aria-label="Anpassungsentscheidung">
        <div className="rounded-[10px] border-2 border-accent bg-surface p-4">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
            <Check className="h-3.5 w-3.5" aria-hidden />
            Deine Anpassungsentscheidung
          </p>
          <h4 className="mt-2 font-heading text-base font-medium text-text">
            {label}
          </h4>
          <p className="mt-2 whitespace-pre-line text-sm text-text-muted">
            {decision.rationale}
          </p>
          <p className="mt-3 text-sm text-text">
            {nextStep
              ? nextStep.hint
              : "Der Evidenzstand bleibt erhalten — der nächste Durchlauf baut auf dem bisherigen Stand auf."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {decision.decision === "LOOP_BACK" && decision.loopBackToPhase && (
              <Link
                href={`/project/${projectId}/phase/${decision.loopBackToPhase}`}
                className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Zu Phase {decision.loopBackToPhase} springen
              </Link>
            )}
            {nextStep && decision.decision !== "CONTINUE" && (
              <Link
                href={`/project/${projectId}/phase/${nextStep.targetPhase}`}
                className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                {nextStep.cta}
              </Link>
            )}
            {nextStep && decision.decision === "CONTINUE" && (
              <Link
                href={`/project/${projectId}/phase/${nextStep.targetPhase}`}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm text-text transition-colors hover:bg-background"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                {nextStep.cta}
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                setSelected(decision.decision);
                setLoopBackPhase(decision.loopBackToPhase ?? 2);
                setRationale(decision.rationale);
                setIsRevising(true);
              }}
              className="rounded-md border border-border px-4 py-2 text-sm text-text transition-colors hover:bg-background"
            >
              Entscheidung ändern
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Anpassungsentscheidung">
      <div className="rounded-[10px] border-2 border-accent bg-surface p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">
          Anpassungsentscheidung
        </p>

        {proposal && (
          <div className="mt-2 rounded-md bg-accent-soft/60 p-3">
            <p className="text-xs font-semibold text-accent">
              Vorschlag der KI:{" "}
              {proposal.decision === "LOOP_BACK" && proposal.loopBackToPhase
                ? `Zurück zu Phase ${proposal.loopBackToPhase}`
                : ADAPTATION_LABELS[proposal.decision]}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-text">
              {proposal.rationale}
            </p>
            <p className="mt-2 text-xs text-text-muted">
              Das ist ein Vorschlag — die Entscheidung triffst du.
            </p>
          </div>
        )}

        <fieldset className="mt-3">
          <legend className="text-xs font-medium text-text">
            Wie geht es mit der priorisierten Option weiter?
          </legend>
          <div className="mt-1.5 flex flex-col gap-1.5">
            {ADAPTATION_ORDER.map((type) => (
              <label
                key={type}
                className={`flex items-center gap-2.5 rounded-md border px-3 py-2 text-sm transition-colors ${
                  selected === type
                    ? "border-accent bg-accent-soft text-text"
                    : "border-border text-text hover:bg-background"
                }`}
              >
                <input
                  type="radio"
                  name="adaptation-decision"
                  value={type}
                  checked={selected === type}
                  onChange={() => setSelected(type)}
                  className="accent-[var(--accent)]"
                />
                {ADAPTATION_LABELS[type]}
                {proposal?.decision === type && (
                  <span className="ml-auto text-xs text-accent">
                    KI-Vorschlag
                  </span>
                )}
              </label>
            ))}
          </div>
        </fieldset>

        {selected === "LOOP_BACK" && (
          <label className="mt-3 block text-xs font-medium text-text">
            Zielphase
            <select
              value={loopBackPhase}
              onChange={(event) => setLoopBackPhase(Number(event.target.value))}
              className="mt-1 w-full rounded-md border border-border bg-surface p-2 text-sm text-text"
            >
              <option value={1}>Phase 1 — Situationsanalyse</option>
              <option value={2}>Phase 2 — Strategieoptionen</option>
              <option value={3}>Phase 3 — Bewertung & Priorisierung</option>
            </select>
          </label>
        )}

        <label className="mt-3 block text-xs font-medium text-text">
          Begründung (Pflicht)
          <textarea
            value={rationale}
            onChange={(event) => setRationale(event.target.value)}
            rows={3}
            placeholder="Warum triffst du diese Entscheidung? Der KI-Vorschlag kann übernommen oder angepasst werden."
            className="mt-1 w-full rounded-md border border-border bg-surface p-2 text-sm text-text"
          />
        </label>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isBusy || !selected || !rationale.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            <Check className="h-4 w-4" aria-hidden />
            Entscheidung bestätigen
          </button>
          {isRevising && (
            <button
              type="button"
              onClick={() => setIsRevising(false)}
              disabled={isBusy}
              className="rounded-md border border-border px-4 py-2 text-sm text-text transition-colors hover:bg-background"
            >
              Abbrechen
            </button>
          )}
        </div>

        {error && <p className="mt-2 text-xs text-danger-text">{error}</p>}
      </div>
    </section>
  );
}
