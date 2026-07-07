import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { callLLM, LlmValidationError } from "@/lib/openai";
import { PHASE1_PROMPT } from "@/lib/prompts/phase1";
import { phase1ResponseSchema } from "@/lib/schemas/phase1";

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
  segmentLabel: true,
  segmentAspect: true,
} satisfies Prisma.StatementSelect;

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

  if (!project.businessIdea?.trim()) {
    return NextResponse.json(
      { error: "Bitte zuerst das Start-up-Profil speichern — die Geschäftsidee ist Pflicht." },
      { status: 400 }
    );
  }

  // Project context = start-up profile incl. resource information (prompt context rule).
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
  };

  let result;
  try {
    result = await callLLM(PHASE1_PROMPT, context, phase1ResponseSchema);
  } catch (error) {
    if (error instanceof LlmValidationError) {
      return NextResponse.json(
        {
          error:
            "Die KI-Antwort konnte nicht verarbeitet werden. Erneut versuchen — deine Eingaben bleiben erhalten.",
        },
        { status: 502 }
      );
    }
    console.error("Phase 1 LLM call failed:", error);
    return NextResponse.json(
      {
        error:
          "Die Analyse konnte nicht erstellt werden. Erneut versuchen — deine Eingaben bleiben erhalten.",
      },
      { status: 502 }
    );
  }

  // Re-running the analysis replaces drafts that were not adopted yet;
  // adopted statements (the project state) are never touched.
  const statements = await prisma.$transaction(async (tx) => {
    await tx.statement.deleteMany({
      where: { projectId: project.id, phase: 1, adopted: false },
    });
    // AI drafts are always stored with adopted=false (architecture rule 3).
    await tx.statement.createMany({
      data: result.statements.map((statement) => ({
        projectId: project.id,
        phase: 1,
        category: statement.category,
        content: statement.content,
        evidenceStatus: statement.evidenceStatus,
        origin: statement.origin,
        justification: statement.justification,
        sourceRef: statement.sourceRef ?? null,
        uncertainty: statement.uncertainty ?? null,
        segmentLabel: statement.segmentLabel ?? null,
        segmentAspect: statement.segmentAspect ?? null,
        adopted: false,
      })),
    });
    return tx.statement.findMany({
      where: { projectId: project.id, phase: 1 },
      orderBy: { createdAt: "asc" },
      select: statementSelect,
    });
  });

  return NextResponse.json({ statements }, { status: 201 });
}
