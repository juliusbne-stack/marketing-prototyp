import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { callLLM, LlmValidationError } from "@/lib/openai";
import { COMPETITOR_ASPECTS } from "@/lib/competitorAspects";
import { COMPETITOR_RESEARCH_PROMPT } from "@/lib/prompts/competitorResearch";
import { competitorResearchResponseSchema } from "@/lib/schemas/competitorResearch";

const requestSchema = z.object({
  projectId: z.string().min(1),
  competitorLabel: z.string().trim().min(1),
  knownFields: z
    .record(z.enum(COMPETITOR_ASPECTS), z.string().trim().min(1))
    .optional(),
});

const adoptedContextSelect = {
  category: true,
  content: true,
  evidenceStatus: true,
  origin: true,
  justification: true,
  sourceRef: true,
  uncertainty: true,
  segmentLabel: true,
  segmentAspect: true,
  competitorLabel: true,
  competitorAspect: true,
} as const;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "projectId und Akteursname sind Pflichtfelder." },
      { status: 400 }
    );
  }

  const { projectId, competitorLabel, knownFields } = parsed.data;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    return NextResponse.json(
      { error: "Das Projekt wurde nicht gefunden." },
      { status: 404 }
    );
  }

  if (!project.businessIdea?.trim()) {
    return NextResponse.json(
      {
        error:
          "Bitte zuerst das Start-up-Profil speichern — die Geschäftsidee ist Pflicht.",
      },
      { status: 400 }
    );
  }

  const adoptedAnalysis = await prisma.statement.findMany({
    where: { projectId: project.id, phase: 1, adopted: true },
    orderBy: { createdAt: "asc" },
    select: adoptedContextSelect,
  });

  const context = {
    competitorLabel,
    knownFields: knownFields ?? {},
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
    ...(adoptedAnalysis.length > 0
      ? { adoptedAnalysisStatements: adoptedAnalysis }
      : {}),
  };

  try {
    const result = await callLLM(
      COMPETITOR_RESEARCH_PROMPT,
      context,
      competitorResearchResponseSchema,
      { validationRetries: 1 }
    );

    return NextResponse.json(
      { statements: result.statements },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof LlmValidationError) {
      return NextResponse.json(
        {
          error:
            "Die KI-Recherche konnte nicht verarbeitet werden. Erneut versuchen — deine Eingaben bleiben erhalten.",
        },
        { status: 502 }
      );
    }
    console.error("Competitor research LLM call failed:", error);
    return NextResponse.json(
      {
        error:
          "Die simulierte Recherche ist fehlgeschlagen. Erneut versuchen — deine Eingaben bleiben erhalten.",
      },
      { status: 502 }
    );
  }
}
