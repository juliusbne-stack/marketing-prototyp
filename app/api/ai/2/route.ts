import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { callLLM, LlmValidationError } from "@/lib/openai";
import { PHASE2_PROMPT } from "@/lib/prompts/phase2";
import { phase2ResponseSchema } from "@/lib/schemas/phase2";
import { buildPhaseInputLlmContext } from "@/lib/phaseInput/context";

const requestSchema = z.object({
  projectId: z.string().min(1),
});

const optionInclude = {
  statements: {
    include: {
      statement: {
        select: {
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
        },
      },
    },
  },
} satisfies Prisma.StrategyOptionInclude;

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

  // Context rule (docs/PROMPTS.md): profile + ONLY adopted statements of phase 1.
  const adoptedAnalysis = await prisma.statement.findMany({
    where: { projectId: project.id, phase: 1, adopted: true },
    orderBy: { createdAt: "asc" },
    select: {
      category: true,
      content: true,
      evidenceStatus: true,
      origin: true,
      justification: true,
      sourceRef: true,
      uncertainty: true,
      segmentLabel: true,
      segmentAspect: true,
    },
  });

  if (adoptedAnalysis.length === 0) {
    return NextResponse.json(
      {
        error:
          "Es gibt noch keinen übernommenen Arbeitsstand aus Phase 1. Übernimm dort zuerst Aussagen in den Projektstand.",
      },
      { status: 400 }
    );
  }

  const phaseInputContext = await buildPhaseInputLlmContext(project.id, 2);

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
    adoptedAnalysisStatements: adoptedAnalysis,
    ...phaseInputContext,
  };

  let result;
  try {
    result = await callLLM(PHASE2_PROMPT, context, phase2ResponseSchema);
  } catch (error) {
    if (error instanceof LlmValidationError) {
      console.error("Phase 2 LLM validation failed:", error.message);
      return NextResponse.json(
        {
          error:
            "Die KI-Antwort konnte nicht verarbeitet werden. Erneut versuchen — dein Analysebild bleibt erhalten.",
        },
        { status: 502 }
      );
    }
    console.error("Phase 2 LLM call failed:", error);
    return NextResponse.json(
      {
        error:
          "Die Optionen konnten nicht entwickelt werden. Erneut versuchen — dein Analysebild bleibt erhalten.",
      },
      { status: 502 }
    );
  }

  // The schema cannot know the project's segment labels — verify explicitly:
  // every OPT_TARGET_GROUP dimension must reference an existing phase 1
  // segment label (only enforced when labeled segment profiles exist).
  const knownSegmentLabels = new Set(
    adoptedAnalysis
      .filter(
        (statement) =>
          statement.category === "TARGET_SEGMENT" && statement.segmentLabel
      )
      .map((statement) => statement.segmentLabel as string)
  );
  if (knownSegmentLabels.size > 0) {
    const targetGroupsValid = result.options.every((option) =>
      option.dimensions.every(
        (dimension) =>
          dimension.category !== "OPT_TARGET_GROUP" ||
          (dimension.segmentLabel != null &&
            knownSegmentLabels.has(dimension.segmentLabel))
      )
    );
    if (!targetGroupsValid) {
      return NextResponse.json(
        {
          error:
            "Die KI-Antwort passte nicht zu den Segmentprofilen aus Phase 1. Erneut versuchen — dein Analysebild bleibt erhalten.",
        },
        { status: 502 }
      );
    }
  }

  // Re-running replaces DRAFT options (and their dimension statements);
  // adopted/prioritized options are never touched.
  const options = await prisma.$transaction(async (tx) => {
    const draftOptions = await tx.strategyOption.findMany({
      where: { projectId: project.id, status: "DRAFT" },
      select: { id: true, statements: { select: { statementId: true } } },
    });
    const draftStatementIds = draftOptions.flatMap((option) =>
      option.statements.map((link) => link.statementId)
    );
    await tx.strategyOption.deleteMany({
      where: { id: { in: draftOptions.map((option) => option.id) } },
    });
    await tx.statement.deleteMany({
      where: { id: { in: draftStatementIds } },
    });

    // AI drafts: option status DRAFT, dimension statements adopted=false (rule 3).
    for (const option of result.options) {
      await tx.strategyOption.create({
        data: {
          projectId: project.id,
          title: option.title,
          summary: option.summary,
          status: "DRAFT",
          statements: {
            create: option.dimensions.map((dimension) => ({
              statement: {
                create: {
                  projectId: project.id,
                  phase: 2,
                  category: dimension.category,
                  content: dimension.content,
                  evidenceStatus: dimension.evidenceStatus,
                  origin: dimension.origin,
                  justification: dimension.justification,
                  uncertainty: dimension.uncertainty ?? null,
                  adopted: false,
                  // The addressed segment stays a reference to the phase 1
                  // profile — stored only on the target group dimension.
                  segmentLabel:
                    dimension.category === "OPT_TARGET_GROUP"
                      ? (dimension.segmentLabel ?? null)
                      : null,
                },
              },
            })),
          },
        },
      });
    }

    return tx.strategyOption.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "asc" },
      include: optionInclude,
    });
  });

  return NextResponse.json(
    {
      options: options.map((option) => ({
        id: option.id,
        title: option.title,
        summary: option.summary,
        status: option.status,
        prioritizationRationale: option.prioritizationRationale,
        statements: option.statements.map((link) => link.statement),
      })),
    },
    { status: 201 }
  );
}
