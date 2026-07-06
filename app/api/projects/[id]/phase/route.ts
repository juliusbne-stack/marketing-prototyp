import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const advancePhaseSchema = z.object({
  phase: z.number().int().min(2).max(5),
});

// Unlocks the next phase after the user completes the current one via the
// "Weiter zu Phase X" button. currentPhase can only ever increase — going
// back to earlier phases never locks anything again (.cursorrules rule 5).
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = advancePhaseSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige Phasenangabe." },
      { status: 400 }
    );
  }

  const project = await prisma.project.findUnique({
    where: { id },
    select: { currentPhase: true },
  });

  if (!project) {
    return NextResponse.json(
      { error: "Das Projekt wurde nicht gefunden." },
      { status: 404 }
    );
  }

  if (parsed.data.phase <= project.currentPhase) {
    return NextResponse.json({ currentPhase: project.currentPhase });
  }

  const updated = await prisma.project.update({
    where: { id },
    data: { currentPhase: parsed.data.phase },
    select: { currentPhase: true },
  });

  return NextResponse.json(updated);
}
