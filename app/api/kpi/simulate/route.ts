import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { callLLM, LlmValidationError } from "@/lib/openai";
import { KPI_SIMULATION_PROMPT } from "@/lib/prompts/kpiSimulation";
import {
  kpiScenarioSchema,
  kpiSimulationResponseSchema,
} from "@/lib/schemas/kpiSimulation";

const requestSchema = z.object({
  stepId: z.string().min(1),
  scenario: kpiScenarioSchema,
});

const dataPointSelect = {
  id: true,
  metricId: true,
  periodLabel: true,
  value: true,
  assessment: true,
} as const;

// Simulates fictional KPI data points for the metrics of ONE adopted step.
// New points are appended, so repeated simulations build up a history.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "stepId oder Szenario fehlt in der Anfrage." },
      { status: 400 }
    );
  }

  const step = await prisma.validationStep.findUnique({
    where: { id: parsed.data.stepId },
    include: {
      project: true,
      assumption: { select: { content: true } },
      metrics: {
        include: {
          dataPoints: {
            orderBy: { createdAt: "asc" },
            select: { periodLabel: true },
          },
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

  if (!step.adopted) {
    return NextResponse.json(
      {
        error:
          "Kennzahlen gibt es nur für übernommene Umsetzungsschritte. Übernimm den Schritt zuerst in Phase 4.",
      },
      { status: 400 }
    );
  }

  if (step.metrics.length === 0) {
    return NextResponse.json(
      { error: "Für diesen Schritt sind keine Messpunkte definiert." },
      { status: 400 }
    );
  }

  const project = step.project;
  const context = {
    scenario: parsed.data.scenario,
    startupProfile: {
      businessIdea: project.businessIdea,
      productStatus: project.productStatus,
      region: project.region,
      teamSize: project.teamSize,
      budgetMonthly: project.budgetMonthly,
      timePerWeek: project.timePerWeek,
      skillsAndChannels: project.skills,
    },
    step: {
      title: step.title,
      description: step.description,
      channel: step.channel,
      testedAssumption: step.assumption.content,
    },
    metrics: step.metrics.map((metric) => ({
      id: metric.id,
      name: metric.name,
      successCriterion: metric.successCriterion,
      failureCriterion: metric.failureCriterion,
    })),
    // Existing history so the simulation continues the period numbering.
    existingPeriodLabels: step.metrics[0].dataPoints.map(
      (point) => point.periodLabel
    ),
  };

  let result;
  try {
    result = await callLLM(
      KPI_SIMULATION_PROMPT,
      context,
      kpiSimulationResponseSchema
    );
  } catch (error) {
    if (error instanceof LlmValidationError) {
      return NextResponse.json(
        {
          error:
            "Die KI-Antwort konnte nicht verarbeitet werden. Erneut versuchen — vorhandene Kennzahlen bleiben erhalten.",
        },
        { status: 502 }
      );
    }
    console.error("KPI simulation LLM call failed:", error);
    return NextResponse.json(
      {
        error:
          "Die Kennzahlen konnten nicht simuliert werden. Erneut versuchen — vorhandene Kennzahlen bleiben erhalten.",
      },
      { status: 502 }
    );
  }

  // The schema cannot know valid metric ids — verify coverage explicitly.
  const knownMetricIds = new Set(step.metrics.map((metric) => metric.id));
  const returnedMetricIds = new Set(
    result.series.map((series) => series.metricId)
  );
  const allKnown = [...returnedMetricIds].every((id) => knownMetricIds.has(id));
  const allCovered = [...knownMetricIds].every((id) =>
    returnedMetricIds.has(id)
  );
  if (!allKnown || !allCovered) {
    return NextResponse.json(
      {
        error:
          "Die KI-Antwort passte nicht zu den Messpunkten des Schritts. Erneut versuchen — vorhandene Kennzahlen bleiben erhalten.",
      },
      { status: 502 }
    );
  }

  await prisma.kpiDataPoint.createMany({
    data: result.series.flatMap((series) =>
      series.points.map((point) => ({
        metricId: series.metricId,
        periodLabel: point.periodLabel,
        value: point.value,
        assessment: point.assessment,
      }))
    ),
  });

  // Full history per metric (cuid ids are monotonic, so id breaks ties of
  // identical createdAt timestamps within one createMany batch).
  const dataPoints = await prisma.kpiDataPoint.findMany({
    where: { metricId: { in: [...knownMetricIds] } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: dataPointSelect,
  });

  return NextResponse.json({ dataPoints }, { status: 201 });
}
