import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { buildKpiFeedbackSummary } from "@/lib/kpiSummary";

const requestSchema = z.object({
  stepId: z.string().min(1),
});

const feedbackSelect = {
  id: true,
  projectId: true,
  stepId: true,
  statementId: true,
  content: true,
  result: true,
  interpretation: true,
  proposedNewStatus: true,
  statusApplied: true,
} as const;

// LLM-free bridge to phase 5: turns the step's KPI data points into a factual
// summary (template) and stores it as a MarketFeedback DRAFT. The user reviews,
// edits and evaluates it in phase 5 as usual — no automatic assessment.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "stepId fehlt in der Anfrage." },
      { status: 400 }
    );
  }

  const step = await prisma.validationStep.findUnique({
    where: { id: parsed.data.stepId },
    include: {
      metrics: {
        include: {
          dataPoints: {
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            select: {
              periodLabel: true,
              value: true,
              numerator: true,
              denominator: true,
              assessment: true,
            },
          },
        },
      },
      feedbacks: { select: { id: true } },
    },
  });

  if (!step) {
    return NextResponse.json(
      { error: "Der Umsetzungsschritt wurde nicht gefunden." },
      { status: 404 }
    );
  }

  const hasDataPoints = step.metrics.some(
    (metric) => metric.dataPoints.length > 0
  );
  if (!hasDataPoints) {
    return NextResponse.json(
      { error: "Für diesen Schritt liegen noch keine Kennzahlen vor." },
      { status: 400 }
    );
  }

  if (step.feedbacks.length > 0) {
    return NextResponse.json(
      {
        error:
          "Für diesen Schritt existiert bereits eine Rückmeldung — prüfe und bearbeite sie in Phase 5.",
      },
      { status: 409 }
    );
  }

  const feedback = await prisma.marketFeedback.create({
    data: {
      projectId: step.projectId,
      stepId: step.id,
      statementId: step.assumptionId,
      content: buildKpiFeedbackSummary(step.metrics),
      // Placeholder until the user evaluates in phase 5 (interpretation stays null).
      result: "AMBIGUOUS",
    },
    select: feedbackSelect,
  });

  return NextResponse.json(feedback, { status: 201 });
}
