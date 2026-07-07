"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChartLine,
  ListChecks,
  MessageSquareText,
  Radio,
  Sparkles,
} from "lucide-react";
import { StepImplementationFrame } from "@/components/steps/StepImplementationFrame";
import { ProgressButton } from "@/components/ui/ProgressButton";
import { formatImplementationGoals } from "@/lib/formatImplementationGoals";
import { RESULT_CONFIG } from "@/components/phase5/types";
import type { KpiScenario } from "@/lib/schemas/kpiSimulation";
import {
  KPI_ASSESSMENT_CONFIG,
  type CockpitStepData,
  type KpiDataPointData,
  type TaskData,
} from "./types";

const SCENARIOS: {
  value: KpiScenario;
  label: string;
  tooltip: string;
}[] = [
  {
    value: "SUPPORTING",
    label: "Stützend",
    tooltip: "erzeugt Werte, die die Erfolgskriterien erfüllen",
  },
  {
    value: "MIXED",
    label: "Gemischt",
    tooltip: "mischt stützende und neutrale Verläufe über die Messperiode",
  },
  {
    value: "CONTRADICTING",
    label: "Widersprechend",
    tooltip: "erzeugt Werte, die die Misserfolgskriterien reißen",
  },
];

// One cockpit card per adopted validation step: (a) task checklist,
// (b) simulated KPI values per metric, (c) bridge to phase 5.
export function CockpitStepCard({
  projectId,
  step,
  readOnly = false,
  highlightNextTask = false,
  embedded = false,
}: {
  projectId: string;
  step: CockpitStepData;
  readOnly?: boolean;
  highlightNextTask?: boolean;
  embedded?: boolean;
}) {
  const [tasks, setTasks] = useState<TaskData[]>(step.tasks);
  const [metrics, setMetrics] = useState(step.metrics);
  const [hasFeedback, setHasFeedback] = useState(step.hasFeedback);
  const [feedbackCreated, setFeedbackCreated] = useState(false);
  const [timeframe, setTimeframe] = useState(step.timeframe);
  const [budgetFrame, setBudgetFrame] = useState(step.budgetFrame);
  const [scenario, setScenario] = useState<KpiScenario>("MIXED");
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isBridging, setIsBridging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doneCount = tasks.filter((task) => task.done).length;
  const hasDataPoints = metrics.some((metric) => metric.dataPoints.length > 0);
  const nextTaskIndex = highlightNextTask
    ? tasks.findIndex((task) => !task.done)
    : -1;
  const implementationGoals = formatImplementationGoals(metrics, timeframe);

  async function handleSaveFrame(data: {
    timeframe: string | null;
    budgetFrame: string | null;
  }) {
    setError(null);
    try {
      const response = await fetch("/api/steps", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: step.id,
          timeframe: data.timeframe,
          budgetFrame: data.budgetFrame,
        }),
      });
      if (!response.ok) {
        throw new Error();
      }
      const updated = await response.json();
      setTimeframe(updated.timeframe);
      setBudgetFrame(updated.budgetFrame);
      return true;
    } catch {
      setError(
        "Der Umsetzungsrahmen konnte nicht gespeichert werden. Erneut versuchen."
      );
      return false;
    }
  }

  async function handleGenerateTasks() {
    setIsGeneratingTasks(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepId: step.id }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          body?.error ??
            "Die Aufgaben konnten nicht erstellt werden. Erneut versuchen."
        );
      }
      setTasks(body.tasks);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Die Aufgaben konnten nicht erstellt werden. Erneut versuchen."
      );
    } finally {
      setIsGeneratingTasks(false);
    }
  }

  async function handleToggleTask(task: TaskData) {
    const nextDone = !task.done;
    setTasks((current) =>
      current.map((entry) =>
        entry.id === task.id ? { ...entry, done: nextDone } : entry
      )
    );
    setError(null);
    try {
      const response = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, done: nextDone }),
      });
      if (!response.ok) {
        throw new Error();
      }
    } catch {
      setTasks((current) =>
        current.map((entry) =>
          entry.id === task.id ? { ...entry, done: task.done } : entry
        )
      );
      setError("Das Häkchen konnte nicht gespeichert werden. Erneut versuchen.");
    }
  }

  async function handleSimulate() {
    setIsSimulating(true);
    setError(null);
    try {
      const response = await fetch("/api/kpi/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepId: step.id, scenario }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          body?.error ??
            "Die Kennzahlen konnten nicht simuliert werden. Erneut versuchen."
        );
      }
      const dataPoints: KpiDataPointData[] = body.dataPoints;
      setMetrics((current) =>
        current.map((metric) => ({
          ...metric,
          dataPoints: dataPoints.filter(
            (point) => point.metricId === metric.id
          ),
        }))
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Die Kennzahlen konnten nicht simuliert werden. Erneut versuchen."
      );
    } finally {
      setIsSimulating(false);
    }
  }

  async function handleBridgeToFeedback() {
    setIsBridging(true);
    setError(null);
    try {
      const response = await fetch("/api/kpi/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepId: step.id }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          body?.error ??
            "Die Rückmeldung konnte nicht angelegt werden. Erneut versuchen."
        );
      }
      setHasFeedback(true);
      setFeedbackCreated(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Die Rückmeldung konnte nicht angelegt werden. Erneut versuchen."
      );
    } finally {
      setIsBridging(false);
    }
  }

  return (
    <div
      className={
        embedded
          ? undefined
          : "rounded-[10px] border border-border bg-surface p-4"
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="font-heading text-sm font-medium text-text">
          {step.title}
        </h4>
        {step.channel && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">
            <Radio className="h-3 w-3" aria-hidden />
            {step.channel}
          </span>
        )}
      </div>
      <p className="mt-1 text-[13px] text-text-muted">
        Geprüfte Annahme: {step.assumptionContent}
      </p>
      <StepImplementationFrame
        timeframe={timeframe}
        budgetFrame={budgetFrame}
        readOnly={readOnly}
        onSave={readOnly ? undefined : handleSaveFrame}
      />

      {implementationGoals && (
        <p className="mt-3 text-[13px] text-text-muted">
          <span className="font-medium text-text">Ziel dieser Umsetzung:</span>{" "}
          {implementationGoals}
        </p>
      )}

      {/* (a) Aufgaben */}
      <section aria-label="Aufgaben" className="mt-4">
        <div className="flex items-center justify-between gap-2">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
            <ListChecks className="h-3.5 w-3.5" aria-hidden />
            Aufgaben
          </p>
          {tasks.length > 0 && (
            <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-medium text-text-muted">
              {doneCount}/{tasks.length}
            </span>
          )}
        </div>

        {tasks.length === 0 ? (
          readOnly ? (
            <p className="mt-2 text-[13px] text-text-muted">
              Keine Aufgaben erfasst.
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed border-border bg-background p-3">
              <p className="text-[13px] text-text-muted">
                Die KI zerlegt den Schritt in kleinteilige, chronologisch
                geordnete Aufgaben mit Praxistipps.
              </p>
              <ProgressButton
                type="button"
                onClick={handleGenerateTasks}
                loading={isGeneratingTasks}
                loadingLabel="Aufgaben werden erstellt …"
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                Aufgaben mit KI erstellen
              </ProgressButton>
            </div>
          )
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {tasks.map((task, index) => {
              const isNext = index === nextTaskIndex;
              const titleClass = task.done
                ? "text-text-muted line-through"
                : isNext
                  ? "font-semibold text-text"
                  : "text-text";

              if (readOnly) {
                return (
                  <li
                    key={task.id}
                    className="rounded-md px-2 py-1.5"
                  >
                    <span className={`block text-sm ${titleClass}`}>
                      {isNext && (
                        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-accent">
                          Als Nächstes:
                        </span>
                      )}
                      {task.title}
                    </span>
                    {task.hint && (
                      <span className="mt-0.5 block text-xs text-text-muted">
                        {task.hint}
                      </span>
                    )}
                  </li>
                );
              }

              return (
                <li key={task.id}>
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-background">
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={() => handleToggleTask(task)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[#0e5a63]"
                    />
                    <span>
                      <span className={`block text-sm ${titleClass}`}>
                        {isNext && (
                          <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-accent">
                            Als Nächstes:
                          </span>
                        )}
                        {task.title}
                      </span>
                      {task.hint && (
                        <span className="mt-0.5 block text-xs text-text-muted">
                          {task.hint}
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* (b) Kennzahlen */}
      <section aria-label="Kennzahlen" className="mt-4 border-t border-border pt-3">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
          <ChartLine className="h-3.5 w-3.5" aria-hidden />
          Kennzahlen (fiktiv)
        </p>
        <p className="mt-1.5 text-[13px] text-text-muted">
          Im Prototyp werden Kanalkennzahlen simuliert — im Zielsystem kämen sie
          automatisch aus den angebundenen Kanälen (z. B. Instagram). Wähle ein
          Szenario, um den Verlauf der Umsetzungsperiode durchzuspielen.
        </p>

        <div className="mt-2 flex flex-col gap-3">
          {metrics.map((metric) => {
            const latest = metric.dataPoints.at(-1);
            const latestConfig = latest
              ? KPI_ASSESSMENT_CONFIG[latest.assessment]
              : null;
            return (
              <div key={metric.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-medium text-text">{metric.name}</p>
                  {latest && latestConfig ? (
                    <span
                      title={`${latest.periodLabel}: ${latest.value} (${latestConfig.label})`}
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${latestConfig.chipClassName}`}
                    >
                      {latest.periodLabel}: {latest.value}
                    </span>
                  ) : (
                    <span className="text-xs text-text-muted">
                      Noch keine Werte
                    </span>
                  )}
                </div>
                {metric.dataPoints.length > 0 && (
                  <div
                    className="mt-1.5 flex items-center gap-1.5"
                    aria-label={`Verlauf ${metric.name}`}
                  >
                    {metric.dataPoints.map((point) => {
                      const config = KPI_ASSESSMENT_CONFIG[point.assessment];
                      return (
                        <span
                          key={point.id}
                          title={`${point.periodLabel}: ${point.value} (${config.label})`}
                          className={`h-2 w-2 rounded-full ${config.dotClassName}`}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!readOnly && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md bg-background p-3">
            <div
              role="radiogroup"
              aria-label="Simulationsszenario"
              className="flex flex-wrap items-center gap-1.5"
            >
              {SCENARIOS.map((entry) => {
                const isSelected = scenario === entry.value;
                return (
                  <button
                    key={entry.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    title={entry.tooltip}
                    onClick={() => setScenario(entry.value)}
                    disabled={isSimulating}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                      isSelected
                        ? "bg-accent text-white"
                        : "border border-border bg-surface text-text-muted hover:text-accent"
                    }`}
                  >
                    {entry.label}
                  </button>
                );
              })}
            </div>
            <div className="ml-auto">
              <ProgressButton
                type="button"
                onClick={handleSimulate}
                loading={isSimulating}
                loadingLabel="Kennzahlen werden simuliert …"
              >
                <ChartLine className="h-4 w-4" aria-hidden />
                Kennzahlen simulieren
              </ProgressButton>
            </div>
          </div>
        )}
      </section>

      {/* (c) Fußzeile: Brücke zu Phase 5 */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        {readOnly ? (
          step.feedbackEvaluated && step.feedbackResult ? (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${RESULT_CONFIG[step.feedbackResult].className}`}
            >
              {RESULT_CONFIG[step.feedbackResult].label}
            </span>
          ) : (
            <p className="text-[13px] text-text-muted">
              Rückmeldung erfasst —{" "}
              <Link
                href={`/project/${projectId}/phase/5`}
                className="font-medium text-accent hover:underline"
              >
                in Phase 5 auswerten
              </Link>
            </p>
          )
        ) : feedbackCreated ? (
          <p className="text-[13px] text-text-muted">
            Als Entwurf angelegt —{" "}
            <Link
              href={`/project/${projectId}/phase/5`}
              className="font-medium text-accent hover:underline"
            >
              in Phase 5 prüfen, bearbeiten und auswerten
            </Link>
            .
          </p>
        ) : hasFeedback ? (
          <p className="text-[13px] text-text-muted">
            Für diesen Schritt liegt bereits eine Rückmeldung vor —{" "}
            <Link
              href={`/project/${projectId}/phase/5`}
              className="font-medium text-accent hover:underline"
            >
              in Phase 5 bearbeiten
            </Link>
            .
          </p>
        ) : (
          <>
            <p className="text-[13px] text-text-muted">
              Erzeugt aus den Kennzahlen einen sachlichen Rückmeldungs-Entwurf
              für Phase 5 — ohne automatische Auswertung.
            </p>
            <ProgressButton
              type="button"
              onClick={handleBridgeToFeedback}
              loading={isBridging}
              loadingPhase="save"
              disabled={!hasDataPoints}
              title={
                hasDataPoints
                  ? undefined
                  : "Simuliere zuerst Kennzahlen für diesen Schritt."
              }
              loadingLabel="Rückmeldung wird angelegt …"
            >
              <MessageSquareText className="h-4 w-4" aria-hidden />
              Kennzahlen als Rückmeldung übernehmen
            </ProgressButton>
          </>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-danger-text">{error}</p>}
    </div>
  );
}
