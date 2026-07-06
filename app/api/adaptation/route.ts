import { NextResponse } from "next/server";
import { z } from "zod";
import { AdaptationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const createAdaptationSchema = z
  .object({
    projectId: z.string().min(1),
    optionId: z.string().min(1),
    decision: z.enum(AdaptationType),
    rationale: z.string().trim().min(1),
    loopBackToPhase: z.number().int().min(1).max(3).nullish(),
  })
  .refine(
    (data) => data.decision !== "LOOP_BACK" || data.loopBackToPhase != null,
    "Bei LOOP_BACK muss die Zielphase angegeben sein."
  );

// The adaptation decision is made by the USER (F9/NF3). The AI proposal from
// /api/ai/5 is never persisted directly — only the user-confirmed choice.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createAdaptationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Für die Anpassungsentscheidung fehlt die Begründung." },
      { status: 400 }
    );
  }

  const { projectId, optionId, decision, rationale, loopBackToPhase } =
    parsed.data;

  const option = await prisma.strategyOption.findFirst({
    where: { id: optionId, projectId },
    select: { id: true },
  });

  if (!option) {
    return NextResponse.json(
      { error: "Die Option wurde nicht gefunden." },
      { status: 404 }
    );
  }

  const adaptation = await prisma.$transaction(async (tx) => {
    const created = await tx.adaptationDecision.create({
      data: {
        projectId,
        optionId,
        decision,
        rationale,
        loopBackToPhase: decision === "LOOP_BACK" ? loopBackToPhase : null,
        userConfirmed: true,
      },
      select: {
        id: true,
        optionId: true,
        decision: true,
        rationale: true,
        loopBackToPhase: true,
        userConfirmed: true,
      },
    });

    // Deferring/discarding is reflected in the option status; the option
    // stays available (single project state, .cursorrules rule 5).
    if (decision === "DEFER" || decision === "DISCARD") {
      await tx.strategyOption.update({
        where: { id: optionId },
        data: { status: decision === "DEFER" ? "DEFERRED" : "DISCARDED" },
      });
    }

    return created;
  });

  return NextResponse.json(adaptation, { status: 201 });
}
