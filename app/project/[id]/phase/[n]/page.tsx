import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Phase1View } from "@/components/phase1/Phase1View";
import { Phase2View } from "@/components/phase2/Phase2View";
import { Phase3View } from "@/components/phase3/Phase3View";
import { Phase4View } from "@/components/phase4/Phase4View";
import { Phase5View } from "@/components/phase5/Phase5View";

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
      <Phase1View project={project} initialStatements={statements} />
    );
  }

  if (phaseNumber === 2) {
    const [options, adoptedAnalysisCount] = await Promise.all([
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
    ]);

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
    const option = await prisma.strategyOption.findFirst({
      where: { projectId: id, status: "PRIORITIZED" },
      select: {
        id: true,
        title: true,
        summary: true,
        prioritizationRationale: true,
      },
    });
    const steps = option
      ? await prisma.validationStep.findMany({
          where: { optionId: option.id },
          orderBy: { createdAt: "asc" },
          include: {
            metrics: {
              select: {
                id: true,
                name: true,
                successCriterion: true,
                failureCriterion: true,
              },
            },
            assumption: { select: statementSelect },
          },
        })
      : [];

    phaseContent = (
      <Phase4View projectId={id} option={option} initialSteps={steps} />
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

    // Only adopted validation steps take part in the learning loop.
    const steps = option
      ? await prisma.validationStep.findMany({
          where: { optionId: option.id, adopted: true },
          orderBy: { createdAt: "asc" },
          include: {
            metrics: {
              select: {
                id: true,
                name: true,
                successCriterion: true,
                failureCriterion: true,
              },
            },
            assumption: { select: statementSelect },
          },
        })
      : [];

    const [feedbacks, learnings] = await Promise.all([
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
    ]);

    phaseContent = (
      <Phase5View
        projectId={id}
        option={option}
        initialSteps={steps}
        initialFeedbacks={feedbacks}
        initialLearnings={learnings}
        initialDecision={adaptation}
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
