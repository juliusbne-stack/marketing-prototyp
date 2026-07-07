import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const stepSelect = {
  id: true,
  projectId: true,
  optionId: true,
  assumptionId: true,
  title: true,
  description: true,
  channel: true,
  timeframe: true,
  budgetFrame: true,
  adopted: true,
  metrics: {
    select: {
      id: true,
      name: true,
      successCriterion: true,
      failureCriterion: true,
    },
  },
} as const;

const updateStepSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().trim().min(1).optional(),
    description: z.string().trim().min(1).optional(),
    channel: z.string().trim().nullable().optional(),
    timeframe: z.string().trim().nullable().optional(),
    budgetFrame: z.string().trim().nullable().optional(),
    // Adoption happens only through an explicit user action (F10/NF5).
    adopted: z.boolean().optional(),
    // Full replacement of the step's metrics (AI refinement adoption).
    metrics: z
      .array(
        z.object({
          name: z.string().trim().min(1),
          successCriterion: z.string().trim().min(1),
          failureCriterion: z.string().trim().min(1),
        })
      )
      .min(1)
      .max(2)
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 1, "Keine Änderung angegeben.");

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = updateStepSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Die Änderung konnte nicht verarbeitet werden." },
      { status: 400 }
    );
  }

  const { id, channel, timeframe, budgetFrame, metrics, ...data } = parsed.data;

  try {
    const step = await prisma.validationStep.update({
      where: { id },
      data: {
        ...data,
        ...(channel !== undefined ? { channel: channel || null } : {}),
        ...(timeframe !== undefined ? { timeframe: timeframe || null } : {}),
        ...(budgetFrame !== undefined ? { budgetFrame: budgetFrame || null } : {}),
        ...(metrics !== undefined
          ? { metrics: { deleteMany: {}, create: metrics } }
          : {}),
      },
      select: stepSelect,
    });
    return NextResponse.json(step);
  } catch {
    return NextResponse.json(
      { error: "Der Umsetzungsschritt wurde nicht gefunden." },
      { status: 404 }
    );
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "id fehlt in der Anfrage." },
      { status: 400 }
    );
  }

  try {
    await prisma.validationStep.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Der Umsetzungsschritt wurde nicht gefunden." },
      { status: 404 }
    );
  }
}
