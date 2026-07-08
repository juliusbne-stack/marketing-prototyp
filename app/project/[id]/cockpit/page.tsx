import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import { CockpitZones } from "@/components/cockpit/CockpitZones";
import { CockpitFooter } from "@/components/cockpit/CockpitFooter";
import { CockpitCompletionBanner } from "@/components/cockpit/CockpitCompletionBanner";
import type { CockpitStepData } from "@/components/cockpit/types";
import {
  cockpitTaskTotals,
  recommendFocusStep,
  sortActiveSteps,
} from "@/lib/cockpitRecommendation";
import {
  allStepsHaveFeedback,
  getImplementationPeriodProgress,
  getLongestActiveTimeframe,
} from "@/lib/cockpitPeriod";
import { prisma } from "@/lib/prisma";
import { taskSelect } from "@/lib/tasks";
import { reassessDataPoints } from "@/lib/kpiAssessment";
import { buildImplementationStatements } from "@/lib/implementationStatements";
import { taskElaborationResponseSchema } from "@/lib/schemas/taskElaboration";

// Implementation cockpit — companion view for the implementation period
// between phase 4 (adopted steps) and phase 5 (market feedback).
export default async function CockpitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!project) {
    notFound();
  }

  // Same option resolution as phase 5: latest adaptation decision keeps the
  // view addressable after DEFER/DISCARD, otherwise the prioritized option.
  const adaptation = await prisma.adaptationDecision.findFirst({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
    select: { optionId: true },
  });
  const optionInclude = {
    statements: {
      include: {
        statement: {
          select: {
            id: true,
            category: true,
            content: true,
            adopted: true,
            evidenceStatus: true,
          },
        },
      },
    },
  } as const;
  const option = adaptation
    ? await prisma.strategyOption.findUnique({
        where: { id: adaptation.optionId },
        include: optionInclude,
      })
    : await prisma.strategyOption.findFirst({
        where: { projectId: id, status: "PRIORITIZED" },
        include: optionInclude,
      });

  // The cockpit accompanies only adopted steps (project state).
  const steps = option
    ? await prisma.validationStep.findMany({
        where: { optionId: option.id, adopted: true },
        orderBy: { createdAt: "asc" },
        include: {
          assumption: {
            select: { content: true, evidenceStatus: true },
          },
          metrics: {
            include: {
              dataPoints: {
                orderBy: [{ createdAt: "asc" }, { id: "asc" }],
                select: {
                  id: true,
                  metricId: true,
                  periodLabel: true,
                  value: true,
                  assessment: true,
                },
              },
            },
          },
          tasks: {
            orderBy: { sortOrder: "asc" },
            select: taskSelect,
          },
          feedbacks: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              result: true,
              interpretation: true,
            },
          },
        },
      })
    : [];

  const adoptedAnalysis = option
    ? await prisma.statement.findMany({
        where: { projectId: id, phase: 1, adopted: true },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          category: true,
          content: true,
          evidenceStatus: true,
        },
      })
    : [];

  const adoptedStatements = option
    ? buildImplementationStatements(option.statements, adoptedAnalysis).map(
        (statement) => ({
          id: statement.id,
          content: statement.content,
          evidenceStatus: statement.evidenceStatus as
            | "FACT"
            | "ASSUMPTION"
            | "OPEN_QUESTION",
          displayNumber: statement.displayNumber,
        })
      )
    : [];

  // Evidence balance of the option's adopted dimensions for the header.
  const dimensionStatements = (option?.statements ?? [])
    .map((link) => link.statement)
    .filter((statement) => statement.adopted);
  const balance = {
    fact: dimensionStatements.filter((s) => s.evidenceStatus === "FACT").length,
    assumption: dimensionStatements.filter(
      (s) => s.evidenceStatus === "ASSUMPTION"
    ).length,
    openQuestion: dimensionStatements.filter(
      (s) => s.evidenceStatus === "OPEN_QUESTION"
    ).length,
  };

  const cockpitSteps: CockpitStepData[] = steps.map((step) => {
    const feedback = step.feedbacks[0] ?? null;
    return {
      id: step.id,
      title: step.title,
      description: step.description,
      channel: step.channel,
      assumptionContent: step.assumption.content,
      assumptionEvidenceStatus: step.assumption.evidenceStatus,
      timeframe: step.timeframe,
      budgetFrame: step.budgetFrame,
      metrics: step.metrics.map((metric) => ({
        id: metric.id,
        name: metric.name,
        evaluationMode: metric.evaluationMode,
        successCriterion: metric.successCriterion,
        failureCriterion: metric.failureCriterion,
        dataPoints: reassessDataPoints(metric, metric.dataPoints),
      })),
      tasks: step.tasks.map((task) => {
        const parsedElaboration = task.elaboration
          ? taskElaborationResponseSchema.safeParse(task.elaboration)
          : null;
        return {
          id: task.id,
          stepId: task.stepId,
          title: task.title,
          hint: task.hint,
          sortOrder: task.sortOrder,
          done: task.done,
          annahmenBezugId: task.annahmenBezugId,
          erfolgskriterium: task.erfolgskriterium,
          elaboration:
            parsedElaboration?.success ? parsedElaboration.data : null,
          elaborationGeneratedAt:
            task.elaborationGeneratedAt?.toISOString() ?? null,
        };
      }),
      adoptedStatements,
      hasFeedback: feedback !== null,
      feedbackEvaluated: feedback?.interpretation !== null,
      feedbackResult: feedback?.result ?? null,
    };
  });

  const activeSteps = sortActiveSteps(
    cockpitSteps.filter((step) => !step.hasFeedback)
  );
  const completedSteps = cockpitSteps.filter((step) => step.hasFeedback);
  const { step: focusStep, reason: focusReason } =
    recommendFocusStep(activeSteps);
  const otherActiveSteps = focusStep
    ? activeSteps.filter((step) => step.id !== focusStep.id)
    : [];
  const taskTotals = cockpitTaskTotals(cockpitSteps);
  const periodProgress = getImplementationPeriodProgress(cockpitSteps);
  const longestTimeframe = getLongestActiveTimeframe(cockpitSteps);
  const periodComplete = allStepsHaveFeedback(cockpitSteps);

  return (
    <div>
      <header className="mb-8">
        <h2 className="font-heading text-[22px] font-semibold text-text">
          Umsetzungs-Cockpit
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Begleitet die Umsetzungsperiode zwischen Phase 4 und 5: Aufgaben je
          übernommenem Schritt und simulierte Kennzahlen als Vorbereitung der
          Marktrückmeldung.
        </p>
      </header>

      {!option || cockpitSteps.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-border bg-surface p-8 text-center text-sm text-text-muted">
          Das Cockpit begleitet die Umsetzungsperiode deiner übernommenen
          Umsetzungsschritte. Übernimm zuerst in Phase 4 mindestens einen
          Umsetzungsschritt in den Projektstand.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {periodComplete && <CockpitCompletionBanner projectId={id} />}

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
            <p className="mt-2 text-xs text-text-muted">
              Evidenzbilanz der Option: {balance.fact}{" "}
              {balance.fact === 1 ? "Fakt" : "Fakten"} · {balance.assumption}{" "}
              {balance.assumption === 1 ? "Annahme" : "Annahmen"} ·{" "}
              {balance.openQuestion}{" "}
              {balance.openQuestion === 1 ? "offene Frage" : "offene Fragen"}
              <span className="mx-1.5 text-border">·</span>
              Umsetzungsperiode: {periodProgress.withFeedback} von{" "}
              {periodProgress.total} Schritten mit Rückmeldung
              <span className="mx-1.5 text-border">·</span>
              Richtdauer: {longestTimeframe ?? "—"}
              <span className="mx-1.5 text-border">·</span>
              {activeSteps.length}{" "}
              {activeSteps.length === 1 ? "aktiver Schritt" : "aktive Schritte"}{" "}
              · {completedSteps.length} abgeschlossen · Aufgaben{" "}
              {taskTotals.done}/{taskTotals.total} erledigt
            </p>
          </div>

          <CockpitZones
            projectId={id}
            focusStep={focusStep}
            focusReason={focusReason}
            otherActiveSteps={otherActiveSteps}
            completedSteps={completedSteps}
          />

          <CockpitFooter
            projectId={id}
            hasAdoptedSteps
            periodComplete={periodComplete}
          />
        </div>
      )}
    </div>
  );
}
