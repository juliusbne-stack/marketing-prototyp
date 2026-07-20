"use client";

import { useState } from "react";
import {
  BarChart3,
  ChevronDown,
  Gauge,
  Layers3,
  MessageSquareText,
  Pencil,
  Radio,
  Target,
  TrendingUp,
} from "lucide-react";
import type { StepWithAssumption } from "@/components/phase4/types";
import type { FeedbackData } from "./types";
import { formatCriterionInline } from "@/lib/kpiAssessment";

const KPI_SUMMARY_HEADING =
  "Kennzahlen aus dem Umsetzungs-Cockpit (fiktive, simulierte Werte):";

function FeedbackContent({ content }: { content: string }) {
  const blocks = content
    .trim()
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
  const isKpiSummary = blocks[0] === KPI_SUMMARY_HEADING;

  if (!isKpiSummary) {
    return (
      <div className="space-y-3 text-sm leading-6 text-text">
        {blocks.map((block, index) => (
          <p key={index} className="whitespace-pre-line">
            {block}
          </p>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {blocks.slice(1).map((block, index) => {
        const lines = block.split("\n").map((line) => line.trim());
        const metricMatch = lines[0]?.match(/^Metrik „(.+)":$/);
        const metricName = metricMatch?.[1] ?? lines[0];
        const detailLines = lines.slice(1).filter(Boolean);
        const periods: {
          label: string;
          periodValue: string;
          cumulativeValue: string;
        }[] = [];
        let totalResult: string | null = null;
        let periodCount: string | null = null;
        let assessment: string | null = null;
        const notes: string[] = [];

        for (let lineIndex = 0; lineIndex < detailLines.length; lineIndex += 1) {
          const periodValue = detailLines[lineIndex + 1]?.match(
            /^Diese Periode:\s*(.+)$/
          )?.[1];
          const cumulativeValue = detailLines[lineIndex + 2]?.match(
            /^Kumuliert:\s*(.+)$/
          )?.[1];

          if (periodValue && cumulativeValue) {
            periods.push({
              label: detailLines[lineIndex],
              periodValue,
              cumulativeValue,
            });
            lineIndex += 2;
            continue;
          }

          const totalMatch = detailLines[lineIndex].match(
            /^Gesamtergebnis:\s*(.+)$/
          );
          if (totalMatch) {
            totalResult = totalMatch[1];
            continue;
          }

          if (/^\d+\s+Erhebungswellen?$/.test(detailLines[lineIndex])) {
            periodCount = detailLines[lineIndex];
            continue;
          }

          const assessmentMatch = detailLines[lineIndex].match(
            /^Bewertung:\s*(.+)$/
          );
          if (assessmentMatch) {
            assessment = assessmentMatch[1];
            continue;
          }

          notes.push(detailLines[lineIndex]);
        }

        const assessmentTone = assessment?.startsWith("Stützend")
          ? "border-kpi-supporting-text/20 bg-kpi-supporting-bg text-kpi-supporting-text"
          : assessment?.startsWith("Widerlegend")
            ? "border-kpi-contradicting-text/20 bg-kpi-contradicting-bg text-kpi-contradicting-text"
            : "border-accent/20 bg-accent-soft text-accent-deep";

        return (
          <section
            key={`${metricName}-${index}`}
            className="overflow-hidden rounded-lg border border-border bg-surface"
          >
            <div className="border-b border-border bg-background/70 px-3.5 py-3">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent-deep">
                  <BarChart3 className="h-3.5 w-3.5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h5 className="text-sm font-semibold leading-5 text-text">
                    {metricName}
                  </h5>
                </div>
              </div>
            </div>

            {detailLines.length > 0 && (
              <div className="space-y-3 p-3.5">
                {periods.length > 0 && (
                  <div
                    className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
                    aria-label={`Verlauf ${metricName}`}
                  >
                    {periods.map((period, periodIndex) => (
                      <div
                        key={`${period.label}-${periodIndex}`}
                        className="overflow-hidden rounded-lg border border-border bg-background/55"
                      >
                        <div className="flex items-center gap-2 border-b border-border bg-background px-3 py-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-soft text-[10px] font-semibold tabular-nums text-accent-deep">
                            {periodIndex + 1}
                          </span>
                          <p className="text-xs font-semibold text-text">
                            {period.label}
                          </p>
                        </div>
                        <dl className="space-y-2 px-3 py-2.5">
                          <div className="flex items-baseline justify-between gap-3">
                            <dt className="text-[11px] text-text-muted">
                              Diese Periode
                            </dt>
                            <dd className="text-xs font-semibold tabular-nums text-text">
                              {period.periodValue}
                            </dd>
                          </div>
                          <div className="flex items-baseline justify-between gap-3 border-t border-border/70 pt-2">
                            <dt className="text-[11px] text-text-muted">
                              Kumuliert
                            </dt>
                            <dd className="text-xs font-semibold tabular-nums text-accent">
                              {period.cumulativeValue}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    ))}
                  </div>
                )}

                {totalResult && (
                  <div className="flex flex-wrap items-center gap-3 rounded-lg border border-accent/20 bg-accent-soft px-3.5 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-white">
                      <TrendingUp className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-accent/75">
                        Gesamtergebnis
                      </p>
                      <p className="mt-0.5 text-base font-semibold tabular-nums text-text">
                        {totalResult}
                      </p>
                    </div>
                    {periodCount && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/15 bg-surface/70 px-2.5 py-1 text-[11px] font-medium text-accent">
                        <Layers3 className="h-3 w-3" aria-hidden />
                        {periodCount}
                      </span>
                    )}
                  </div>
                )}

                {assessment && (
                  <div
                    className={`rounded-lg border px-3.5 py-3 ${assessmentTone}`}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
                      Bewertung
                    </p>
                    <p className="mt-1 text-[13px] font-medium leading-5">
                      {assessment}
                    </p>
                  </div>
                )}

                {notes.length > 0 && (
                  <div className="space-y-1.5 px-0.5 text-[12px] leading-5 text-text-muted">
                    {notes.map((note, noteIndex) => (
                      <p key={noteIndex}>{note}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

export function FeedbackForm({
  projectId,
  step,
  feedback,
  kpiSummary = null,
  onSaved,
}: {
  projectId: string;
  step: StepWithAssumption;
  feedback: FeedbackData | null;
  // LLM-free summary of the cockpit KPI data (null = no data points yet).
  kpiSummary?: string | null;
  onSaved: (feedback: FeedbackData) => void;
}) {
  const [isEditing, setIsEditing] = useState(feedback === null);
  const [draft, setDraft] = useState(feedback?.content ?? "");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const content = draft.trim();
    if (!content) return;
    setIsBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/feedback", {
        method: feedback ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          feedback
            ? { id: feedback.id, content }
            : { projectId, stepId: step.id, content }
        ),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          body?.error ??
            "Die Rückmeldung konnte nicht gespeichert werden. Erneut versuchen."
        );
      }
      // PATCH responses wrap the feedback ({ feedback, statement }).
      onSaved(feedback ? body.feedback : body);
      setIsEditing(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Die Rückmeldung konnte nicht gespeichert werden. Erneut versuchen."
      );
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div
      id={`step-feedback-${step.id}`}
      className="scroll-mt-6 overflow-hidden rounded-[10px] border border-border bg-surface"
    >
      <div className="border-b border-border px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-heading text-sm font-medium text-text">
            {step.title}
          </h4>
          {step.channel && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent-deep">
              <Radio className="h-3 w-3" aria-hidden />
              {step.channel}
            </span>
          )}
        </div>

        <div className="mt-3 overflow-hidden rounded-md bg-background">
          <div className="flex items-start gap-2.5 px-3 py-2.5">
            <Target
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent"
              aria-hidden
            />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                Geprüfte Annahme
              </p>
              <p className="mt-1 text-[13px] leading-5 text-text">
                {step.assumption.content}
              </p>
            </div>
          </div>

          <details className="group border-t border-border">
            <summary className="flex cursor-pointer list-none items-center gap-2.5 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted transition-colors hover:bg-surface/60">
              <Gauge className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
              <span>Prüfkriterien</span>
              <span className="rounded-full bg-surface px-1.5 py-0.5 text-[10px] tabular-nums">
                {step.metrics.length}
              </span>
              <ChevronDown
                className="ml-auto h-3.5 w-3.5 transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <ul className="space-y-2 border-t border-border px-3 py-2.5 pl-9 text-[12px] leading-5 text-text-muted">
              {step.metrics.map((metric) => (
                <li key={metric.id}>
                  <span className="font-medium text-text">{metric.name}:</span>{" "}
                  stützend bei {formatCriterionInline(metric.successCriterion)},
                  widerlegend bei{" "}
                  {formatCriterionInline(metric.failureCriterion)}
                </li>
              ))}
            </ul>
          </details>
        </div>
      </div>

      {isEditing ? (
        <div className="p-4">
          <label className="block text-xs font-medium text-text">
            Was ist passiert? (fiktive Rückmeldung eintragen)
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={3}
              placeholder="z. B. Ergebnisse der Interviews, Zahlen aus dem Kanaltest …"
              className="mt-1 w-full rounded-md border border-border bg-surface p-2 text-sm text-text"
            />
          </label>
          {kpiSummary && (
            <button
              type="button"
              onClick={() => setDraft(kpiSummary)}
              disabled={isBusy}
              className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline disabled:opacity-50"
            >
              <Gauge className="h-3.5 w-3.5" aria-hidden />
              Kennzahlen aus dem Cockpit übernehmen
            </button>
          )}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isBusy || !draft.trim()}
              className="btn-primary btn-primary--sm"
            >
              <MessageSquareText className="h-3.5 w-3.5" aria-hidden />
              Rückmeldung speichern
            </button>
            {feedback && (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setDraft(feedback.content);
                }}
                disabled={isBusy}
                className="rounded-md border border-border px-3 py-1.5 text-xs text-text transition-colors hover:bg-background"
              >
                Abbrechen
              </button>
            )}
          </div>
        </div>
      ) : (
        feedback && (
          <div className="bg-background/40 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent-soft text-accent-deep">
                  <MessageSquareText className="h-3.5 w-3.5" aria-hidden />
                </span>
                Erfasste Rückmeldung
              </p>
              <button
                type="button"
                onClick={() => {
                  setDraft(feedback.content);
                  setIsEditing(true);
                }}
                disabled={isBusy}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-accent-border hover:text-accent"
              >
                <Pencil className="h-3 w-3" aria-hidden />
                Bearbeiten
              </button>
            </div>
            <FeedbackContent content={feedback.content} />
          </div>
        )
      )}

      {error && <p className="px-4 pb-4 text-xs text-danger-text">{error}</p>}
    </div>
  );
}
