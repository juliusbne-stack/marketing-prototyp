import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { kpiDataPointInputSchema } from "@/lib/schemas/kpiSimulation";
import { aggregateMetric } from "@/lib/metrics/aggregateMetric";

const requestSchema = z.object({
  metricId: z.string().min(1),
  periodLabel: z.string().trim().min(1),
  value: z.number().finite().optional(),
  numerator: z.number().finite().nonnegative().optional(),
  denominator: z.number().finite().positive().optional(),
});

const dataPointSelect = {
  id: true,
  metricId: true,
  periodLabel: true,
  value: true,
  numerator: true,
  denominator: true,
  assessment: true,
} as const;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsedRequest = requestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: "Der Datenpunkt ist unvollständig oder nicht numerisch." },
      { status: 400 }
    );
  }

  const parsedPoint = kpiDataPointInputSchema.safeParse({
    ...parsedRequest.data,
    assessment: "NEUTRAL",
  });
  if (!parsedPoint.success) {
    return NextResponse.json(
      {
        error:
          parsedPoint.error.issues[0]?.message ??
          "Der Datenpunkt ist für diese Messgröße ungültig.",
      },
      { status: 400 }
    );
  }

  const metric = await prisma.metric.findUnique({
    where: { id: parsedRequest.data.metricId },
    include: {
      step: { select: { adopted: true } },
      dataPoints: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: dataPointSelect,
      },
    },
  });
  if (!metric) {
    return NextResponse.json(
      { error: "Die Messgröße wurde nicht gefunden." },
      { status: 404 }
    );
  }
  if (!metric.step.adopted) {
    return NextResponse.json(
      { error: "Datenpunkte können nur für übernommene Schritte erfasst werden." },
      { status: 400 }
    );
  }

  const canonicalPoint = {
    periodLabel: parsedPoint.data.periodLabel,
    value:
      parsedPoint.data.value === undefined
        ? null
        : String(parsedPoint.data.value),
    numerator: parsedPoint.data.numerator ?? null,
    denominator: parsedPoint.data.denominator ?? null,
    assessment: "NEUTRAL" as const,
  };
  const aggregation = aggregateMetric(metric, [
    ...metric.dataPoints,
    canonicalPoint,
  ]);
  if (!aggregation.isValid) {
    return NextResponse.json(
      {
        error:
          aggregation.errors[0] ??
          "Der Datenpunkt passt nicht zur Wertart der Messgröße.",
      },
      { status: 400 }
    );
  }

  const createData: Prisma.KpiDataPointUncheckedCreateInput = {
    metricId: metric.id,
    periodLabel: canonicalPoint.periodLabel,
    value: canonicalPoint.value,
    numerator: canonicalPoint.numerator,
    denominator: canonicalPoint.denominator,
    assessment: aggregation.assessment,
  };
  await prisma.kpiDataPoint.create({ data: createData });

  const dataPoints = await prisma.kpiDataPoint.findMany({
    where: { metricId: metric.id },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: dataPointSelect,
  });
  return NextResponse.json({ dataPoints }, { status: 201 });
}
