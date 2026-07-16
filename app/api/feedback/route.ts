import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

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

const createFeedbackSchema = z.object({
  projectId: z.string().min(1),
  stepId: z.string().min(1),
  content: z.string().trim().min(1),
});

// The user records a (fictional) market feedback per validation step. The AI
// assessment happens later via /api/ai/5 — until then interpretation stays
// null ("not yet assessed"). The schema requires a result, so AMBIGUOUS is
// stored as a neutral placeholder.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createFeedbackSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Die Rückmeldung ist unvollständig." },
      { status: 400 }
    );
  }

  const step = await prisma.validationStep.findFirst({
    where: { id: parsed.data.stepId, projectId: parsed.data.projectId },
    select: { id: true, assumptionId: true },
  });

  if (!step) {
    return NextResponse.json(
      { error: "Der Umsetzungsschritt wurde nicht gefunden." },
      { status: 404 }
    );
  }

  const feedback = await prisma.marketFeedback.create({
    data: {
      projectId: parsed.data.projectId,
      stepId: step.id,
      statementId: step.assumptionId,
      content: parsed.data.content,
      result: "AMBIGUOUS",
    },
    select: feedbackSelect,
  });

  return NextResponse.json(feedback, { status: 201 });
}

const updateFeedbackSchema = z
  .object({
    id: z.string().min(1),
    content: z.string().trim().min(1).optional(),
    // Applies the AI-proposed evidence status to the tested assumption —
    // only through an explicit user action (F10/NF5).
    applyStatus: z.literal(true).optional(),
    // Sibling feedbacks of the SAME statement that are bundled into one
    // consolidated evidence update — they are marked as processed together.
    bundledIds: z.array(z.string().min(1)).optional(),
  })
  .refine(
    (data) => data.content !== undefined || data.applyStatus === true,
    "Keine Änderung angegeben."
  );

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = updateFeedbackSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Die Änderung konnte nicht verarbeitet werden." },
      { status: 400 }
    );
  }

  const { id, content, applyStatus, bundledIds } = parsed.data;

  const feedback = await prisma.marketFeedback.findUnique({
    where: { id },
    select: { id: true, statementId: true, proposedNewStatus: true },
  });

  if (!feedback) {
    return NextResponse.json(
      { error: "Die Rückmeldung wurde nicht gefunden." },
      { status: 404 }
    );
  }

  if (applyStatus && !feedback.proposedNewStatus) {
    return NextResponse.json(
      { error: "Es liegt kein vorgeschlagener Evidenzstatus vor." },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedFeedback = await tx.marketFeedback.update({
      where: { id },
      data: {
        // Changing the content invalidates a previous assessment.
        ...(content
          ? {
              content,
              result: "AMBIGUOUS" as const,
              interpretation: null,
              proposedNewStatus: null,
              statusApplied: false,
            }
          : {}),
        ...(applyStatus ? { statusApplied: true } : {}),
      },
      select: feedbackSelect,
    });

    // The consolidated evidence update covers all bundled feedbacks of the
    // same statement — mark them as processed alongside the primary one.
    let bundledFeedbacks: (typeof updatedFeedback)[] = [];
    if (applyStatus && bundledIds && bundledIds.length > 0) {
      await tx.marketFeedback.updateMany({
        where: { id: { in: bundledIds }, statementId: feedback.statementId },
        data: { statusApplied: true },
      });
      bundledFeedbacks = await tx.marketFeedback.findMany({
        where: { id: { in: bundledIds }, statementId: feedback.statementId },
        select: feedbackSelect,
      });
    }

    const statement = applyStatus
      ? await tx.statement.update({
          where: { id: feedback.statementId },
          data: { evidenceStatus: feedback.proposedNewStatus! },
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
            supersededByStatementId: true,
          },
        })
      : null;

    return {
      feedback: updatedFeedback,
      feedbacks: [updatedFeedback, ...bundledFeedbacks],
      statement,
    };
  });

  return NextResponse.json(result);
}
