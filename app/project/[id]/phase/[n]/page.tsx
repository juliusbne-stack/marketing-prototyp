import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { OPTION_DIMENSION_CATEGORIES } from "@/lib/schemas/phase2";
import { buildKpiFeedbackSummary } from "@/lib/kpiSummary";
import { resolvePestelRelevance } from "@/lib/pestelRelevance";
import { activeValidationStepWhere } from "@/lib/validationStep";
import { Phase1View } from "@/components/phase1/Phase1View";
import { Phase2View } from "@/components/phase2/Phase2View";
import { Phase3View } from "@/components/phase3/Phase3View";
import { Phase4View } from "@/components/phase4/Phase4View";
import { Phase5View } from "@/components/phase5/Phase5View";
import { parseMarketingActivities } from "@/components/phase4/types";
import { buildImplementationStatements } from "@/lib/implementationStatements";
import { taskSelect } from "@/lib/tasks";
import { countActionableTasks } from "@/lib/taskActionable";
import { getPhase4Mode } from "@/lib/phase4/mode";
import type { AdoptedAussageInput } from "@/lib/phase4/strategyAssistant";
import { loadPhaseInputsForPage } from "@/lib/phaseInput/context";

const statementSelect = {
  id: true,
  projectId: true,
  phase: true,
  category: true,
  content: true,
  evidenceStatus: true,
  origin: true,
  justification: true,
  sourceRef: true,
  uncertainty: true,
  isCritical: true,
  adopted: true,
  segmentLabel: true,
  segmentAspect: true,
  competitorLabel: true,
  competitorAspect: true,
} as const;

const PHASE_INFO: Record<
  number,
  { title: string; description: string; emptyState: string }
> = {
  1: {
    title: "Situationsanalyse",
    description:
      "Aus deinem Start-up-Profil entsteht ein evidenzbewertetes Analysebild mit simulierten Recherchedaten.",
    emptyState:
      "In dieser Phase beschreibst du dein Start-up und erhältst ein Analysebild aus PESTEL, Zielgruppen, Wettbewerb und SWOT.",
  },
  2: {
    title: "Strategieoptionen",
    description:
      "Aus deinem Analysebild entstehen 2–3 vergleichbare Strategieoptionen als Hypothesenbündel.",
    emptyState:
      "In dieser Phase entstehen aus deinem Analysebild 2–3 vergleichbare Strategieoptionen. Verfügbar, sobald Phase 1 einen übernommenen Arbeitsstand hat.",
  },
  3: {
    title: "Bewertung & Priorisierung",
    description:
      "Die Optionen werden anhand von sechs Kriterien verglichen — die Priorisierung entscheidest du.",
    emptyState:
      "In dieser Phase vergleichst du die Strategieoptionen und priorisierst begründet eine davon. Verfügbar, sobald Phase 2 einen übernommenen Arbeitsstand hat.",
  },
  4: {
    title: "Validierende Umsetzung",
    description:
      "Kritische Annahmen der priorisierten Option werden in begrenzte Umsetzungsschritte mit Messpunkten übersetzt.",
    emptyState:
      "In dieser Phase werden die kritischsten Annahmen deiner priorisierten Option in prüfbare Umsetzungsschritte übersetzt. Verfügbar, sobald Phase 3 abgeschlossen ist.",
  },
  5: {
    title: "Lernen & Anpassung",
    description:
      "Marktrückmeldungen aktualisieren den Evidenzstatus deiner Annahmen und führen zu einer Anpassungsentscheidung.",
    emptyState:
      "In dieser Phase erfasst du Marktrückmeldungen und entscheidest über die strategische Anpassung. Verfügbar, sobald Phase 4 einen übernommenen Arbeitsstand hat.",
  },
};

export default async function PhasePage({
  params,
}: {
  params: Promise<{ id: string; n: string }>;
}) {
  const { id, n } = await params;
  const phaseNumber = Number(n);
  const phase = PHASE_INFO[phaseNumber];

  if (!phase || !Number.isInteger(phaseNumber)) {
    notFound();
  }

  let phaseContent: React.ReactNode = null;
  if (phaseNumber === 1) {
    const [project, statements] = await Promise.all([
      prisma.project.findUnique({
        where: { id },
        select: {
          id: true,
          businessIdea: true,
          productStatus: true,
          assumedTarget: true,
          assumedProblem: true,
          valuePropDraft: true,
          revenueIdea: true,
          region: true,
          teamSize: true,
          budgetMonthly: true,
          timePerWeek: true,
          skills: true,
          existingInsights: true,
          profileOnboardingComplete: true,
          profileOnboardingStep: true,
          pestelRelevance: true,
        },
      }),
      prisma.statement.findMany({
        where: { projectId: id, phase: 1 },
        orderBy: { createdAt: "asc" },
        select: statementSelect,
      }),
    ]);

    if (!project) {
      notFound();
    }

    phaseContent = (
      <Phase1View
        project={project}
        initialStatements={statements}
        initialPestelRelevance={resolvePestelRelevance(
          project.pestelRelevance,
          statements
        )}
      />
    );
  }

  if (phaseNumber === 2) {
    const [options, adoptedAnalysisCount, latestAdaptation, phase2Inputs] =
      await Promise.all([
        prisma.strategyOption.findMany({
          where: { projectId: id },
          orderBy: { createdAt: "asc" },
          include: {
            statements: { include: { statement: { select: statementSelect } } },
          },
        }),
        prisma.statement.count({
          where: { projectId: id, phase: 1, adopted: true },
        }),
        prisma.adaptationDecision.findFirst({
          where: { projectId: id },
          orderBy: { createdAt: "desc" },
          select: { decision: true, createdAt: true },
        }),
        loadPhaseInputsForPage(id, 2),
      ]);

    // Revision mode (learning loop): the latest phase 5 decision is ADAPT and
    // a prioritized option exists that can be reworked here.
    const prioritizedOption = options.find(
      (option) => option.status === "PRIORITIZED"
    );
    const revisionMode =
      latestAdaptation?.decision === "ADAPT" && Boolean(prioritizedOption);

    const [initialRevisions, adoptedRevisionCount] = revisionMode
      ? await Promise.all([
          // Pending proposals: phase 2 dimension statements not linked to any
          // option yet (the AI revision route creates them unlinked).
          prisma.statement.findMany({
            where: {
              projectId: id,
              phase: 2,
              origin: "AI_DERIVATION",
              adopted: false,
              category: { in: [...OPTION_DIMENSION_CATEGORIES] },
              optionLinks: { none: {} },
            },
            orderBy: { createdAt: "asc" },
            select: statementSelect,
          }),
          // Already adopted revisions: statements linked to the prioritized
          // option that were created after the ADAPT decision.
          prisma.statement.count({
            where: {
              optionLinks: { some: { optionId: prioritizedOption!.id } },
              createdAt: { gt: latestAdaptation!.createdAt },
            },
          }),
        ])
      : [[], 0];

    phaseContent = (
      <Phase2View
        projectId={id}
        initialOptions={options.map((option) => ({
          id: option.id,
          title: option.title,
          summary: option.summary,
          status: option.status,
          prioritizationRationale: option.prioritizationRationale,
          statements: option.statements.map((link) => link.statement),
        }))}
        hasAdoptedAnalysis={adoptedAnalysisCount > 0}
        initialPhaseInputs={phase2Inputs}
        revisionMode={revisionMode}
        initialRevisions={initialRevisions}
        initialHasAdoptedRevision={adoptedRevisionCount > 0}
      />
    );
  }

  if (phaseNumber === 3) {
    // Only adopted options (hypothesis bundles) can be evaluated and prioritized.
    const options = await prisma.strategyOption.findMany({
      where: {
        projectId: id,
        status: { in: ["ADOPTED", "PRIORITIZED", "DEFERRED"] },
      },
      orderBy: { createdAt: "asc" },
      include: {
        evaluations: {
          select: {
            id: true,
            optionId: true,
            criterion: true,
            score: true,
            rationale: true,
          },
        },
      },
    });

    phaseContent = (
      <Phase3View
        projectId={id}
        initialOptions={options.map((option) => ({
          id: option.id,
          title: option.title,
          summary: option.summary,
          status: option.status,
          prioritizationRationale: option.prioritizationRationale,
        }))}
        initialEvaluations={options.flatMap((option) => option.evaluations)}
      />
    );
  }

  if (phaseNumber === 4) {
    // Phase 4 works exclusively on the prioritized option (M5).
    const [optionWithStatements, phase4Mode, phase4Inputs] = await Promise.all([
      prisma.strategyOption.findFirst({
        where: { projectId: id, status: "PRIORITIZED" },
        select: {
          id: true,
          title: true,
          summary: true,
          prioritizationRationale: true,
          diversityNote: true,
          modeNote: true,
          statements: {
            include: {
              statement: {
                select: {
                  id: true,
                  category: true,
                  content: true,
                  evidenceStatus: true,
                  adopted: true,
                },
              },
            },
          },
        },
      }),
      getPhase4Mode(id),
      loadPhaseInputsForPage(id, 4),
    ]);
    const option = optionWithStatements
      ? {
          id: optionWithStatements.id,
          title: optionWithStatements.title,
          summary: optionWithStatements.summary,
          prioritizationRationale: optionWithStatements.prioritizationRationale,
          diversityNote: optionWithStatements.diversityNote,
          modeNote: optionWithStatements.modeNote,
        }
      : null;

    const adoptedAnalysis = optionWithStatements
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

    const adoptedAussagen: AdoptedAussageInput[] = optionWithStatements
      ? buildImplementationStatements(
          optionWithStatements.statements,
          adoptedAnalysis
        ).map((statement) => ({
          id: statement.id,
          text: statement.content,
          evidenceStatus: statement.evidenceStatus,
          kategorie: statement.category,
        }))
      : [];

    const rawSteps = optionWithStatements
      ? await prisma.validationStep.findMany({
          where: { optionId: optionWithStatements.id, ...activeValidationStepWhere },
          orderBy: { createdAt: "asc" },
          include: {
            metrics: {
              select: {
                id: true,
                name: true,
                evaluationMode: true,
                metricRole: true,
                signalCategory: true,
                proxyStrength: true,
                signalRationale: true,
                successCriterion: true,
                failureCriterion: true,
                dataPoints: {
                  orderBy: [{ createdAt: "asc" }, { id: "asc" }],
                  select: { periodLabel: true, value: true, assessment: true },
                },
              },
            },
            assumption: { select: statementSelect },
            tasks: {
              orderBy: { sortOrder: "asc" },
              select: taskSelect,
            },
          },
        })
      : [];
    const steps = rawSteps.map(({ tasks, metrics, discardedAt, marketingActivities, ...step }) => ({
      ...step,
      stepType: step.stepType ?? "VALIDATION",
      strategyDimension: step.strategyDimension ?? null,
      testSubject: step.testSubject ?? null,
      methodWarning: step.methodWarning ?? null,
      discardedAt: discardedAt?.toISOString() ?? null,
      marketingActivities: parseMarketingActivities(marketingActivities),
      metrics: metrics.map(({ dataPoints: _dataPoints, ...metric }) => ({
        ...metric,
        signalCategory: metric.signalCategory ?? null,
        proxyStrength: metric.proxyStrength ?? null,
        signalRationale: metric.signalRationale ?? null,
      })),
      cockpitReadinessInput: {
        tasks: tasks.map((task) => ({ done: task.done })),
        metrics: metrics.map((metric) => ({
          evaluationMode: metric.evaluationMode,
          name: metric.name,
          successCriterion: metric.successCriterion,
          failureCriterion: metric.failureCriterion,
          dataPoints: metric.dataPoints,
        })),
      },
      assistantTasks: tasks.map((task) => ({
        id: task.id,
        text: task.title,
        erfolgskriterium: task.erfolgskriterium ?? null,
        annahmenBezugId: task.annahmenBezugId ?? null,
      })),
      hasKpiDataPoints: metrics.some((metric) => metric.dataPoints.length > 0),
      taskProgress:
        tasks.length > 0
          ? countActionableTasks(tasks)
          : null,
    }));

    const feedbacks =
      steps.length > 0
        ? await prisma.marketFeedback.findMany({
            where: { stepId: { in: steps.map((step) => step.id) } },
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              projectId: true,
              stepId: true,
              statementId: true,
              content: true,
              result: true,
              interpretation: true,
              proposedNewStatus: true,
              statusApplied: true,
            },
          })
        : [];

    phaseContent = (
      <Phase4View
        projectId={id}
        option={option}
        initialSteps={steps}
        initialFeedbacks={feedbacks}
        phase4Mode={phase4Mode}
        adoptedAussagen={adoptedAussagen}
        initialPhaseInputs={phase4Inputs}
        initialMeta={{
          diversityNote: option?.diversityNote ?? null,
          modeNote: option?.modeNote ?? null,
          emptyState: null,
        }}
      />
    );
  }

  if (phaseNumber === 5) {
    // After a confirmed DEFER/DISCARD the option is no longer PRIORITIZED —
    // the latest adaptation decision keeps the phase 5 view addressable.
    const adaptation = await prisma.adaptationDecision.findFirst({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        optionId: true,
        decision: true,
        rationale: true,
        loopBackToPhase: true,
        userConfirmed: true,
        createdAt: true,
      },
    });
    const optionSelect = {
      id: true,
      title: true,
      summary: true,
      prioritizationRationale: true,
    } as const;
    const option = adaptation
      ? await prisma.strategyOption.findUnique({
          where: { id: adaptation.optionId },
          select: optionSelect,
        })
      : await prisma.strategyOption.findFirst({
          where: { projectId: id, status: "PRIORITIZED" },
          select: optionSelect,
        });

    // Only adopted validation steps take part in the learning loop (including
    // discarded ones — their feedback history must remain addressable).
    const rawPhase5Steps = option
      ? await prisma.validationStep.findMany({
          where: { optionId: option.id, adopted: true },
          orderBy: { createdAt: "asc" },
          include: {
            metrics: {
              select: {
                id: true,
                name: true,
                evaluationMode: true,
                metricRole: true,
                signalCategory: true,
                proxyStrength: true,
                signalRationale: true,
                successCriterion: true,
                failureCriterion: true,
              },
            },
            assumption: { select: statementSelect },
          },
        })
      : [];
    const steps = rawPhase5Steps.map((step) => ({
      ...step,
      stepType: step.stepType ?? "VALIDATION",
      strategyDimension: step.strategyDimension ?? null,
      testSubject: step.testSubject ?? null,
      methodWarning: step.methodWarning ?? null,
      discardedAt: step.discardedAt?.toISOString() ?? null,
      marketingActivities: parseMarketingActivities(step.marketingActivities),
      metrics: step.metrics.map((metric) => ({
        ...metric,
        signalCategory: metric.signalCategory ?? null,
        proxyStrength: metric.proxyStrength ?? null,
        signalRationale: metric.signalRationale ?? null,
      })),
    }));

    const [feedbacks, learnings, kpiMetrics] = await Promise.all([
      prisma.marketFeedback.findMany({
        where: { stepId: { in: steps.map((step) => step.id) } },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          projectId: true,
          stepId: true,
          statementId: true,
          content: true,
          result: true,
          interpretation: true,
          proposedNewStatus: true,
          statusApplied: true,
        },
      }),
      prisma.statement.findMany({
        where: { projectId: id, phase: 5, category: "LEARNING" },
        orderBy: { createdAt: "asc" },
        select: statementSelect,
      }),
      // Cockpit KPI data: offered as an LLM-free prefill for the feedback form.
      prisma.metric.findMany({
        where: { stepId: { in: steps.map((step) => step.id) } },
        select: {
          stepId: true,
          name: true,
          evaluationMode: true,
          successCriterion: true,
          failureCriterion: true,
          dataPoints: {
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            select: { periodLabel: true, value: true, assessment: true },
          },
        },
      }),
    ]);

    const kpiSummaries: Record<string, string> = {};
    for (const step of steps) {
      const stepMetrics = kpiMetrics.filter(
        (metric) => metric.stepId === step.id
      );
      if (stepMetrics.some((metric) => metric.dataPoints.length > 0)) {
        kpiSummaries[step.id] = buildKpiFeedbackSummary(stepMetrics);
      }
    }

    // Run boundary without a schema change: steps created before the latest
    // confirmed adaptation decision belong to the previous validation run.
    const previousRunStepIds = adaptation
      ? steps
          .filter((step) => step.createdAt <= adaptation.createdAt)
          .map((step) => step.id)
      : [];

    phaseContent = (
      <Phase5View
        projectId={id}
        option={option}
        initialSteps={steps}
        initialFeedbacks={feedbacks}
        initialLearnings={learnings}
        initialDecision={
          adaptation
            ? {
                id: adaptation.id,
                optionId: adaptation.optionId,
                decision: adaptation.decision,
                rationale: adaptation.rationale,
                loopBackToPhase: adaptation.loopBackToPhase,
                userConfirmed: adaptation.userConfirmed,
              }
            : null
        }
        previousRunStepIds={previousRunStepIds}
        kpiSummaries={kpiSummaries}
      />
    );
  }

  return (
    <div>
      <header className="mb-8">
        <h2 className="font-heading text-[22px] font-semibold text-text">
          {phase.title}
        </h2>
        <p className="mt-1 text-sm text-text-muted">{phase.description}</p>
      </header>

      {phaseContent ?? (
        <div className="rounded-[10px] border border-dashed border-border bg-surface p-8 text-center text-sm text-text-muted">
          {phase.emptyState}
        </div>
      )}
    </div>
  );
}
