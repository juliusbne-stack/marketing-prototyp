import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { callLLM, LlmValidationError } from "@/lib/openai";
import { PHASE4_REFINE_PROMPT } from "@/lib/prompts/phase4Refine";
import { phase4RefineResponseSchema } from "@/lib/schemas/phase4Refine";

// The refinement history lives only in client state (deliberately not
// persisted) — the client sends it along with each request.
const requestSchema = z.object({
  stepId: z.string().min(1),
  feedback: z.string().trim().min(1),
  previousRounds: z
    .array(
      z.object({
        feedback: z.string().trim().min(1),
        resultTitle: z.string().trim().min(1),
      })
    )
    .default([]),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "stepId oder Feedback fehlt in der Anfrage." },
      { status: 400 }
    );
  }

  const step = await prisma.validationStep.findUnique({
    where: { id: parsed.data.stepId },
    include: {
      project: true,
      assumption: {
        select: {
          category: true,
          content: true,
          evidenceStatus: true,
          justification: true,
          uncertainty: true,
        },
      },
      metrics: {
        select: {
          name: true,
          evaluationMode: true,
          successCriterion: true,
          failureCriterion: true,
        },
      },
    },
  });

  if (!step) {
    return NextResponse.json(
      { error: "Der Umsetzungsschritt wurde nicht gefunden." },
      { status: 404 }
    );
  }

  // Refinement only applies to drafts — adopted steps are part of the
  // project state and must not be reworked through this dialog (F10/NF5).
  if (step.adopted) {
    return NextResponse.json(
      {
        error:
          "Dieser Schritt ist bereits übernommen und kann nicht mehr per KI verfeinert werden.",
      },
      { status: 400 }
    );
  }

  const project = step.project;
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
    criticalAssumption: step.assumption,
    currentStep: {
      title: step.title,
      description: step.description,
      channel: step.channel,
      timeframe: step.timeframe,
      budgetFrame: step.budgetFrame,
      metrics: step.metrics,
    },
    userFeedback: parsed.data.feedback,
    previousFeedbackRounds: parsed.data.previousRounds,
  };

  let result;
  try {
    result = await callLLM(
      PHASE4_REFINE_PROMPT,
      context,
      phase4RefineResponseSchema
    );
  } catch (error) {
    if (error instanceof LlmValidationError) {
      return NextResponse.json(
        {
          error:
            "Die KI-Antwort konnte nicht verarbeitet werden. Erneut versuchen — der bisherige Entwurf bleibt erhalten.",
        },
        { status: 502 }
      );
    }
    console.error("Phase 4 refine LLM call failed:", error);
    return NextResponse.json(
      {
        error:
          "Der Überarbeitungsvorschlag konnte nicht erstellt werden. Erneut versuchen — der bisherige Entwurf bleibt erhalten.",
      },
      { status: 502 }
    );
  }

  // Preview only — nothing is persisted until the user adopts the proposal.
  return NextResponse.json({ proposal: result }, { status: 200 });
}
