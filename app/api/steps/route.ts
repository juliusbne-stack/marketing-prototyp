import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveMethodWarningAfterFrameEdit } from "@/lib/phase4/methodWarning";
import { prisma } from "@/lib/prisma";
import { metricInputSchema } from "@/lib/schemas/metric";

const stepSelect = {
  id: true,
  projectId: true,
  optionId: true,
  assumptionId: true,
  title: true,
  description: true,
  validationQuestion: true,
  testDesign: true,
  marketingActivities: true,
  channel: true,
  timeframe: true,
  budgetFrame: true,
  stepType: true,
  strategyDimension: true,
  testSubject: true,
  methodWarning: true,
  adopted: true,
  discardedAt: true,
  metrics: {
    select: {
      id: true,
      name: true,
      evaluationMode: true,
      metricRole: true,
      signalCategory: true,
      proxyStrength: true,
      signalRationale: true,
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
    validationQuestion: z.string().trim().nullable().optional(),
    testDesign: z.string().trim().nullable().optional(),
    // Adoption happens only through an explicit user action (F10/NF5).
    adopted: z.boolean().optional(),
    // Soft discard for adopted steps — keeps tasks, KPIs and feedback intact.
    discard: z.boolean().optional(),
    // Full replacement of the step's metrics (AI refinement adoption).
    metrics: z
      .array(metricInputSchema)
      .min(1)
      .max(3)
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

  const { id, channel, timeframe, budgetFrame, validationQuestion, testDesign, metrics, discard, ...data } =
    parsed.data;

  if (discard) {
    const existing = await prisma.validationStep.findUnique({
      where: { id },
      select: { adopted: true, discardedAt: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Der Umsetzungsschritt wurde nicht gefunden." },
        { status: 404 }
      );
    }
    if (!existing.adopted) {
      return NextResponse.json(
        {
          error:
            "Nicht übernommene Entwürfe können direkt gelöscht werden — Verwerfen gilt nur für übernommene Schritte.",
        },
        { status: 400 }
      );
    }
    if (existing.discardedAt) {
      return NextResponse.json(
        { error: "Diese Validierung wurde bereits als nicht weiter verfolgt markiert." },
        { status: 400 }
      );
    }
  }

  try {
    let methodWarningUpdate: string | null | undefined;
    if (timeframe !== undefined || budgetFrame !== undefined) {
      const existing = await prisma.validationStep.findUnique({
        where: { id },
        select: { methodWarning: true, timeframe: true, budgetFrame: true },
      });
      if (!existing) {
        return NextResponse.json(
          { error: "Der Umsetzungsschritt wurde nicht gefunden." },
          { status: 404 }
        );
      }
      methodWarningUpdate = resolveMethodWarningAfterFrameEdit(
        existing.methodWarning,
        {
          ...(timeframe !== undefined
            ? { timeframe: timeframe || null }
            : {}),
          ...(budgetFrame !== undefined
            ? { budgetFrame: budgetFrame || null }
            : {}),
        }
      );
    }

    const step = await prisma.validationStep.update({
      where: { id },
      data: {
        ...data,
        ...(channel !== undefined ? { channel: channel || null } : {}),
        ...(timeframe !== undefined ? { timeframe: timeframe || null } : {}),
        ...(budgetFrame !== undefined ? { budgetFrame: budgetFrame || null } : {}),
        ...(methodWarningUpdate !== undefined
          ? { methodWarning: methodWarningUpdate }
          : {}),
        ...(validationQuestion !== undefined
          ? { validationQuestion: validationQuestion || null }
          : {}),
        ...(testDesign !== undefined ? { testDesign: testDesign || null } : {}),
        ...(discard ? { discardedAt: new Date() } : {}),
        ...(metrics !== undefined
          ? {
              metrics: {
                deleteMany: {},
                create: metrics.map((metric) => ({
                  name: metric.name,
                  evaluationMode: metric.evaluationMode,
                  valueType: metric.valueType ?? null,
                  aggregationStrategy: metric.aggregationStrategy ?? null,
                  evaluationConfig: metric.evaluationConfig ?? undefined,
                  numeratorLabel: metric.numeratorLabel ?? null,
                  denominatorLabel: metric.denominatorLabel ?? null,
                  observationUnit: metric.observationUnit ?? null,
                  metricRole: metric.metricRole,
                  signalCategory: metric.signalCategory ?? null,
                  proxyStrength: metric.proxyStrength ?? null,
                  signalRationale: metric.signalRationale ?? null,
                  successCriterion: metric.successCriterion,
                  failureCriterion: metric.failureCriterion,
                })),
              },
            }
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

  const existing = await prisma.validationStep.findUnique({
    where: { id },
    select: { adopted: true },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Der Umsetzungsschritt wurde nicht gefunden." },
      { status: 404 }
    );
  }

  // Adopted steps must not be hard-deleted — they may have tasks, KPIs or
  // feedback attached. Use PATCH { discard: true } instead.
  if (existing.adopted) {
    return NextResponse.json(
      {
        error:
          "Übernommene Validierungen können nicht endgültig gelöscht werden. Markiere sie stattdessen als nicht weiter verfolgt.",
      },
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
