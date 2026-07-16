import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { callLLM, LlmValidationError } from "@/lib/openai";
import { KPI_SIMULATION_PROMPT } from "@/lib/prompts/kpiSimulation";
import { reassessDataPoints } from "@/lib/kpiAssessment";
import { adjustSimulationForScenario } from "@/lib/kpiSimulationAdjust";
import { validateMetricDataPoint } from "@/lib/metrics/aggregateMetric";
import {
  kpiScenarioSchema,
  kpiSimulationResponseSchema,
} from "@/lib/schemas/kpiSimulation";
import { isDemoProject } from "@/lib/demo/identity";
import { serveDemoKpiSimulation } from "@/lib/demo/fakeAi/kpiSimulate";

const requestSchema = z.object({
  stepId: z.string().min(1),
  scenario: kpiScenarioSchema,
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
      evaluationMode: metric.evaluationMode,
      valueType: metric.valueType,
      aggregationStrategy: metric.aggregationStrategy,
      evaluationConfig: metric.evaluationConfig,
      numeratorLabel: metric.numeratorLabel,
      denominatorLabel: metric.denominatorLabel,
      successCriterion: metric.successCriterion,
      failureCriterion: metric.failureCriterion,
    })),
    existingPeriodLabelsByMetric: Object.fromEntries(
      step.metrics.map((metric) => [
        metric.id,
        metric.dataPoints.map((point) => point.periodLabel),
      ])
    ),
  };

  let result;
  try {
    if (isDemoProject(project)) {
      result = await serveDemoKpiSimulation(
        step.metrics,
        parsed.data.scenario,
        context.existingPeriodLabelsByMetric
      );
    } else {
      result = await callLLM(
        KPI_SIMULATION_PROMPT,
        context,
        kpiSimulationResponseSchema
      );
    }
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

  const metricById = new Map(step.metrics.map((metric) => [metric.id, metric]));

  const pointsToCreate: Prisma.KpiDataPointCreateManyInput[] = [];
  for (const series of result.series) {
    const metric = metricById.get(series.metricId);
    if (!metric) continue;
    const adjusted = adjustSimulationForScenario(
      metric,
      series.points,
      parsed.data.scenario
    );
    const canonicalPoints = adjusted.map((point) => ({
      periodLabel: point.periodLabel,
      value: point.value === undefined ? null : String(point.value),
      numerator: point.numerator ?? null,
      denominator: point.denominator ?? null,
      assessment: point.assessment,
    }));
    const validationErrors = canonicalPoints.flatMap((point) =>
      validateMetricDataPoint(metric, point)
    );
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          error:
            "Die simulierten Werte passen nicht zur Wertart der Messgröße.",
          details: validationErrors,
        },
        { status: 502 }
      );
    }
    const reassessed = reassessDataPoints(metric, canonicalPoints);
    pointsToCreate.push(
      ...reassessed.map((point) => ({
        metricId: series.metricId,
        periodLabel: point.periodLabel,
        value: point.value,
        numerator: point.numerator,
        denominator: point.denominator,
        assessment: point.assessment,
      }))
    );
  }

  await prisma.kpiDataPoint.createMany({
    data: pointsToCreate,
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
