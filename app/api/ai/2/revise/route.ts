import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ACTIVE_ADOPTED_WHERE, isActiveAdopted } from "@/lib/statementFilters";
import { callLLM, LlmValidationError } from "@/lib/openai";
import { PHASE2_REVISION_PROMPT } from "@/lib/prompts/phase2Revision";
import { phase2RevisionResponseSchema } from "@/lib/schemas/phase2Revision";
import { OPTION_DIMENSION_CATEGORIES } from "@/lib/schemas/phase2";

const requestSchema = z.object({
  projectId: z.string().min(1),
});

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
  supersededByStatementId: true,
  segmentLabel: true,
  segmentAspect: true,
} satisfies Prisma.StatementSelect;

// Revision proposals are phase-2 dimension statements that are NOT yet linked
// to any option — the link is only moved over on explicit user adoption.
const revisionDraftWhere = (projectId: string) =>
  ({
    projectId,
    phase: 2,
    origin: "AI_DERIVATION",
    adopted: false,
    category: { in: [...OPTION_DIMENSION_CATEGORIES] },
    optionLinks: { none: {} },
  }) satisfies Prisma.StatementWhereInput;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "projectId fehlt in der Anfrage." },
      { status: 400 }
    );
  }

  const project = await prisma.project.findUnique({
    where: { id: parsed.data.projectId },
  });

  if (!project) {
    return NextResponse.json(
      { error: "Das Projekt wurde nicht gefunden." },
      { status: 404 }
    );
  }

  // Revision mode requires a confirmed ADAPT decision as the latest decision.
  const latestAdaptation = await prisma.adaptationDecision.findFirst({
    where: { projectId: project.id },
    orderBy: { createdAt: "desc" },
    select: { decision: true },
  });

  if (latestAdaptation?.decision !== "ADAPT") {
    return NextResponse.json(
      {
        error:
          "Es liegt keine Anpassungsentscheidung (ADAPT) aus Phase 5 vor. Triff dort zuerst die Entscheidung.",
      },
      { status: 400 }
    );
  }

  const option = await prisma.strategyOption.findFirst({
    where: { projectId: project.id, status: "PRIORITIZED" },
    include: {
      statements: {
        include: { statement: { select: statementSelect } },
      },
    },
  });

  if (!option) {
    return NextResponse.json(
      { error: "Es gibt keine priorisierte Option, die überarbeitet werden könnte." },
      { status: 400 }
    );
  }

  const optionDimensions = option.statements
    .map((link) => link.statement)
    .filter((statement) => isActiveAdopted(statement));

  // Segment profiles from phase 1 (single source): needed so a revised
  // OPT_TARGET_GROUP can reference an existing segmentLabel and the other
  // dimensions can draw on the profile aspects.
  const adoptedSegmentProfiles = await prisma.statement.findMany({
    where: {
      projectId: project.id,
      phase: 1,
      category: "TARGET_SEGMENT",
      segmentLabel: { not: null },
      ...ACTIVE_ADOPTED_WHERE,
    },
    orderBy: { createdAt: "asc" },
    select: {
      segmentLabel: true,
      segmentAspect: true,
      content: true,
      evidenceStatus: true,
    },
  });

  // Learning results from phase 5: adopted LEARNING statements + feedback
  // assessments (result + interpretation) on the option's assumptions.
  const [adoptedLearnings, feedbacks] = await Promise.all([
    prisma.statement.findMany({
      where: {
        projectId: project.id,
        phase: 5,
        category: "LEARNING",
        ...ACTIVE_ADOPTED_WHERE,
      },
      orderBy: { createdAt: "asc" },
      select: {
        content: true,
        evidenceStatus: true,
        justification: true,
        uncertainty: true,
      },
    }),
    prisma.marketFeedback.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "asc" },
      select: {
        content: true,
        result: true,
        interpretation: true,
        statement: {
          select: { category: true, content: true, evidenceStatus: true },
        },
      },
    }),
  ]);

  if (feedbacks.length === 0 && adoptedLearnings.length === 0) {
    return NextResponse.json(
      {
        error:
          "Es gibt noch keine Lernergebnisse aus Phase 5 (Rückmeldungen oder übernommene Erkenntnisse), auf die sich eine Überarbeitung stützen könnte.",
      },
      { status: 400 }
    );
  }

  const context = {
    startupProfile: {
      businessIdea: project.businessIdea,
      productStatus: project.productStatus,
      assumedTarget: project.assumedTarget,
      assumedProblem: project.assumedProblem,
      valueProposition: project.valuePropDraft,
      revenueIdea: project.revenueIdea,
      region: project.region,
      teamSize: project.teamSize,
      budgetMonthly: project.budgetMonthly,
      timePerWeek: project.timePerWeek,
      skillsAndChannels: project.skills,
      existingCustomerInsights: project.existingInsights,
    },
    prioritizedOption: {
      title: option.title,
      summary: option.summary,
      prioritizationRationale: option.prioritizationRationale,
      dimensions: optionDimensions.map((statement) => ({
        dimensionCategory: statement.category,
        content: statement.content,
        evidenceStatus: statement.evidenceStatus,
        justification: statement.justification,
        uncertainty: statement.uncertainty,
        segmentLabel: statement.segmentLabel,
      })),
    },
    adoptedSegmentProfiles,
    adoptedLearnings,
    feedbackAssessments: feedbacks.map((feedback) => ({
      testedAssumption: {
        dimensionCategory: feedback.statement.category,
        content: feedback.statement.content,
        currentEvidenceStatus: feedback.statement.evidenceStatus,
      },
      marketFeedback: feedback.content,
      result: feedback.result,
      interpretation: feedback.interpretation,
    })),
  };

  let result;
  try {
    result = await callLLM(
      PHASE2_REVISION_PROMPT,
      context,
      phase2RevisionResponseSchema
    );
  } catch (error) {
    if (error instanceof LlmValidationError) {
      return NextResponse.json(
        {
          error:
            "Die KI-Antwort konnte nicht verarbeitet werden. Erneut versuchen — deine Option bleibt unverändert.",
        },
        { status: 502 }
      );
    }
    console.error("Phase 2 revision LLM call failed:", error);
    return NextResponse.json(
      {
        error:
          "Der Überarbeitungsvorschlag konnte nicht erstellt werden. Erneut versuchen — deine Option bleibt unverändert.",
      },
      { status: 502 }
    );
  }

  // The schema cannot know the project's segment labels — verify explicitly:
  // a revised OPT_TARGET_GROUP must reference an existing phase 1 segment
  // label (only enforced when labeled segment profiles exist).
  const knownSegmentLabels = new Set(
    adoptedSegmentProfiles.map((statement) => statement.segmentLabel as string)
  );
  if (knownSegmentLabels.size > 0) {
    const targetGroupValid = result.revisions.every(
      (revision) =>
        revision.dimensionCategory !== "OPT_TARGET_GROUP" ||
        (revision.segmentLabel != null &&
          knownSegmentLabels.has(revision.segmentLabel))
    );
    if (!targetGroupValid) {
      return NextResponse.json(
        {
          error:
            "Die KI-Antwort passte nicht zu den Segmentprofilen aus Phase 1. Erneut versuchen — deine Option bleibt unverändert.",
        },
        { status: 502 }
      );
    }
  }

  // Persist proposals as unlinked draft statements (adopted=false). Re-running
  // replaces earlier, not-yet-adopted proposals; the option is NOT touched.
  const revisions = await prisma.$transaction(async (tx) => {
    await tx.statement.deleteMany({ where: revisionDraftWhere(project.id) });

    const created = [];
    for (const revision of result.revisions) {
      created.push(
        await tx.statement.create({
          data: {
            projectId: project.id,
            phase: 2,
            category: revision.dimensionCategory,
            content: revision.content,
            evidenceStatus: revision.evidenceStatus,
            origin: "AI_DERIVATION",
            justification: revision.justification,
            uncertainty: revision.uncertainty ?? null,
            adopted: false,
            // The addressed segment stays a reference to the phase 1
            // profile — stored only on the target group dimension.
            segmentLabel:
              revision.dimensionCategory === "OPT_TARGET_GROUP"
                ? (revision.segmentLabel ?? null)
                : null,
          },
          select: statementSelect,
        })
      );
    }
    return created;
  });

  return NextResponse.json(
    { revisions, unchanged: result.unchanged },
    { status: 201 }
  );
}
