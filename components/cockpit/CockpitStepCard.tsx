"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChartLine,
  ListChecks,
  MessageSquareText,
  Radio,
  Sparkles,
} from "lucide-react";
import { StepImplementationFrame } from "@/components/steps/StepImplementationFrame";
import { ProgressButton } from "@/components/ui/ProgressButton";
import { getAnchorAssumptionInlinePrefix } from "@/lib/anchorAssumptionLabel";
import { formatImplementationGoals } from "@/lib/formatImplementationGoals";
import { reassessDataPoints } from "@/lib/kpiAssessment";
import { aggregateMetric } from "@/lib/metrics/aggregateMetric";
import {
  deriveStepReadiness,
  TIMEFRAME_ENDPOINT_TOOLTIP,
} from "@/lib/cockpitPeriod";
import { StepReadinessChip } from "./StepReadinessChip";
import { CockpitTaskRow } from "./CockpitTaskRow";
import { RESULT_CONFIG } from "@/components/phase5/types";
import type { KpiScenario } from "@/lib/schemas/kpiSimulation";
import { LAUFMODUS_LABELS } from "@/lib/crossImplementation";
import { countActionableTasks, isActionableTask } from "@/lib/taskActionable";
import {
  KPI_ASSESSMENT_CONFIG,
  type CockpitStepData,
  type KpiDataPointData,
  type TaskData,
} from "./types";
import type { TaskElaborationResponse } from "@/lib/schemas/taskElaboration";

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
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskData[]>(step.tasks);
  const [metrics, setMetrics] = useState(step.metrics);
  const [hasFeedback, setHasFeedback] = useState(step.hasFeedback);
  const [feedbackCreated, setFeedbackCreated] = useState(false);
  const [timeframe, setTimeframe] = useState(step.timeframe);
  const [budgetFrame, setBudgetFrame] = useState(step.budgetFrame);
  const [laufmodus, setLaufmodus] = useState(step.laufmodus);
  const [basiertAufUmsetzung, setBasiertAufUmsetzung] = useState(
    step.basiertAufUmsetzung
  );
  const [scenario, setScenario] = useState<KpiScenario>("MIXED");
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isBridging, setIsBridging] = useState(false);
  const [expandedElaborationTaskId, setExpandedElaborationTaskId] = useState<
    string | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const statementMap = useMemo(
    () => new Map(step.adoptedStatements.map((statement) => [statement.id, statement])),
    [step.adoptedStatements]
  );

  const actionableProgress = countActionableTasks(tasks);
  const hasDataPoints = metrics.some((metric) => metric.dataPoints.length > 0);
  const readiness = deriveStepReadiness(tasks, metrics, hasFeedback);
  const isReadyForFeedback = readiness === "READY_FOR_FEEDBACK";
  const nextTaskIndex = highlightNextTask
    ? tasks.findIndex((task) => isActionableTask(task.herkunft) && !task.done)
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
      setTasks(
        body.tasks.map(
          (task: TaskData & { annahmenBezug?: unknown }) => ({
            id: task.id,
            stepId: task.stepId,
            title: task.title,
            hint: task.hint,
            sortOrder: task.sortOrder,
            done: task.done,
            annahmenBezugId: task.annahmenBezugId ?? null,
            erfolgskriterium: task.erfolgskriterium ?? null,
            elaboration: null,
            elaborationGeneratedAt: null,
            herkunft: task.herkunft ?? "NEU",
            erfuelltDurchUmsetzungId: task.erfuelltDurchUmsetzungId ?? null,
            erfuelltDurchUmsetzung: task.erfuelltDurchUmsetzung ?? null,
          })
        )
      );
      if (body.laufmodus) {
        setLaufmodus(body.laufmodus);
      }
      if (body.basiertAufUmsetzungId && basiertAufUmsetzung === null) {
        const basisTitle =
          step.basiertAufUmsetzung?.title ??
          body.tasks
            .map(
              (task: TaskData) => task.erfuelltDurchUmsetzung?.title ?? null
            )
            .find((title: string | null) => title !== null);
        if (basisTitle) {
          setBasiertAufUmsetzung({
            id: body.basiertAufUmsetzungId,
            title: basisTitle,
          });
        }
      }
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

  function handleElaborationSaved(taskId: string, elaboration: TaskElaborationResponse) {
    setTasks((current) =>
      current.map((entry) =>
        entry.id === taskId
          ? {
              ...entry,
              elaboration,
              elaborationGeneratedAt: new Date().toISOString(),
            }
          : entry
      )
    );
  }

  async function handleToggleTask(task: TaskData) {
    if (!isActionableTask(task.herkunft)) return;

    const nextDone = !task.done;
    const actionable = tasks.filter((entry) => isActionableTask(entry.herkunft));
    const allTasksWillBeDone =
      nextDone &&
      actionable.length > 0 &&
      actionable.every(
        (entry) => entry.id === task.id || entry.done
      );
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
      if (allTasksWillBeDone) {
        router.refresh();
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
        current.map((metric) => {
          const rawPoints = dataPoints.filter(
            (point) => point.metricId === metric.id
          );
          return {
            ...metric,
            dataPoints: reassessDataPoints(metric, rawPoints),
          };
        })
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
      router.refresh();
      window.setTimeout(() => {
        document
          .getElementById("cockpit-jetzt-dran")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
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
        {readiness && <StepReadinessChip readiness={readiness} />}
        {step.channel && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent-deep">
            <Radio className="h-3 w-3" aria-hidden />
            {step.channel}
          </span>
        )}
      </div>
      <p className="mt-1 text-[13px] text-text-muted">
        {getAnchorAssumptionInlinePrefix(step.assumptionEvidenceStatus)}:{" "}
        {step.assumptionContent}
      </p>
      {basiertAufUmsetzung && laufmodus !== "EIGENSTAENDIG" && (
        <p className="mt-1.5 text-xs text-text-muted">
          Baut auf:{" "}
          <span className="font-medium text-text">
            {basiertAufUmsetzung.title}
          </span>
          <span className="mx-1.5 text-border">·</span>
          {LAUFMODUS_LABELS[laufmodus]}
        </p>
      )}
      <StepImplementationFrame
        timeframe={timeframe}
        budgetFrame={budgetFrame}
        readOnly={readOnly}
        timeframeTooltip={TIMEFRAME_ENDPOINT_TOOLTIP}
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
          {actionableProgress.total > 0 && (
            <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-medium text-text-muted">
              {actionableProgress.done}/{actionableProgress.total}
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
            {tasks.map((task, index) => (
              <CockpitTaskRow
                key={task.id}
                task={task}
                isNext={index === nextTaskIndex}
                readOnly={readOnly}
                statementMap={statementMap}
                isExpanded={expandedElaborationTaskId === task.id}
                onExpand={() => setExpandedElaborationTaskId(task.id)}
                onToggleExpanded={() =>
                  setExpandedElaborationTaskId((current) =>
                    current === task.id ? null : task.id
                  )
                }
                onElaborationSaved={(elaboration) =>
                  handleElaborationSaved(task.id, elaboration)
                }
                onToggleDone={() => handleToggleTask(task)}
              />
            ))}
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
            const result = aggregateMetric(metric, metric.dataPoints);
            const displayConfig = KPI_ASSESSMENT_CONFIG[result.assessment];
            return (
              <div key={metric.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-medium text-text">{metric.name}</p>
                  {metric.dataPoints.length > 0 ? (
                    <span
                      title={result.explanation}
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${displayConfig.chipClassName}`}
                    >
                      {result.aggregationStrategy === "NONE"
                        ? "Aktuell"
                        : "Gesamt"}
                      : {result.displayValue} — {displayConfig.label}
                    </span>
                  ) : (
                    <span className="text-xs text-text-muted">
                      Noch keine Werte
                    </span>
                  )}
                </div>
                {result.periods.length > 0 && (
                  <div className="mt-2 grid gap-1.5" aria-label={`Verlauf ${metric.name}`}>
                    {result.periods.map((period, index) => (
                      <div
                        key={`${period.periodLabel}-${index}`}
                        className="rounded-md border border-border bg-background px-2.5 py-2 text-xs"
                      >
                        <p className="font-medium text-text">{period.periodLabel}</p>
                        <p className="mt-0.5 text-text-muted">
                          Diese Periode: {period.periodDisplayValue}
                        </p>
                        <p className="text-text-muted">
                          Kumuliert: {period.cumulativeDisplayValue}
                        </p>
                      </div>
                    ))}
                    <p className="text-xs text-text-muted">
                      {result.periodCount}{" "}
                      {result.periodCount === 1
                        ? "Erhebungswelle"
                        : "Erhebungswellen"}
                    </p>
                    {!result.isValid && (
                      <p className="text-xs text-kpi-contradicting-text">
                        {result.explanation}
                      </p>
                    )}
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
          isReadyForFeedback ? (
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <p className="text-[13px] text-text-muted sm:mr-auto">
                Alle Aufgaben erledigt und Kennzahlen vorhanden — übernimm sie
                als Rückmeldungs-Entwurf für Phase 5.
              </p>
              <ProgressButton
                type="button"
                onClick={handleBridgeToFeedback}
                loading={isBridging}
                loadingPhase="save"
                disabled={!hasDataPoints}
                loadingLabel="Rückmeldung wird angelegt …"
                className="w-full shrink-0 sm:w-auto"
              >
                <MessageSquareText className="h-4 w-4" aria-hidden />
                Kennzahlen als Rückmeldung übernehmen
              </ProgressButton>
            </div>
          ) : (
            <>
              <p className="text-[13px] text-text-muted">
                Erzeugt aus den Kennzahlen einen sachlichen Rückmeldungs-Entwurf
                für Phase 5 — ohne automatische Auswertung.
              </p>
              <button
                type="button"
                onClick={handleBridgeToFeedback}
                disabled={!hasDataPoints || isBridging}
                title={
                  hasDataPoints
                    ? undefined
                    : "Simuliere zuerst Kennzahlen für diesen Schritt."
                }
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
              >
                <MessageSquareText className="h-4 w-4" aria-hidden />
                {isBridging
                  ? "Rückmeldung wird angelegt …"
                  : "Kennzahlen als Rückmeldung übernehmen"}
              </button>
            </>
          )
        )}
      </div>

      {error && <p className="mt-2 text-xs text-danger-text">{error}</p>}
    </div>
  );
}
