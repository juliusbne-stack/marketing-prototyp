/**
 * Validates the Nouriva Meals demo project after seeding.
 * Run: npm run demo:validate
 */
import {
  Criterion,
  StatementCategory,
} from "@prisma/client";
import { prisma } from "../lib/prisma";
import {
  DEMO_BACKUP_PROJECT_NAME,
  DEMO_PROJECT_NAME,
  DEMO_PROJECT_SLUG,
} from "../lib/demo/constants";
import { ACTIVE_ADOPTED_WHERE } from "../lib/statementFilters";
import { OPTION_DIMENSION_CATEGORIES } from "../lib/schemas/phase2";
import { COMPETITOR_ASPECTS } from "../lib/competitorAspects";
import { PESTEL_CATEGORIES } from "../lib/schemas/phase1";
import { taskElaborationResponseSchema } from "../lib/schemas/taskElaboration";
import { aggregateMetric } from "../lib/metrics/aggregateMetric";
import { buildKpiFeedbackSummary } from "../lib/kpiSummary";
import { DEMO_FIXTURE } from "./demo-fixture-data";

const errors: string[] = [];

function fail(message: string) {
  errors.push(message);
}

function ok(condition: boolean, message: string) {
  if (!condition) fail(message);
}

async function main() {
  const variant = process.argv.includes("--start")
    ? "start"
    : process.argv.includes("--phase4-screenshot")
      ? "phase4"
      : process.argv.includes("--phase5-entry")
        ? "phase5"
        : "full";

  const projects = await prisma.project.findMany({
    where: {
      AND: [
        {
          OR: [
            { name: DEMO_PROJECT_NAME },
            { name: { contains: DEMO_PROJECT_SLUG, mode: "insensitive" } },
          ],
        },
        { name: { not: DEMO_BACKUP_PROJECT_NAME } },
      ],
    },
  });

  ok(projects.length === 1, `Expected exactly 1 demo project, found ${projects.length}`);
  if (projects.length !== 1) {
    report();
    return;
  }

  const project = projects[0]!;
  const projectId = project.id;

  ok(project.profileOnboardingComplete === true, "profileOnboardingComplete should be true");
  ok(project.profileOnboardingStep === 12, `profileOnboardingStep should be 12, got ${project.profileOnboardingStep}`);

  for (const field of [
    "businessIdea",
    "productStatus",
    "assumedTarget",
    "assumedProblem",
    "valuePropDraft",
    "revenueIdea",
    "region",
    "teamSize",
    "budgetMonthly",
    "timePerWeek",
    "skills",
    "existingInsights",
  ] as const) {
    ok(Boolean(project[field]), `Profile field ${field} is missing`);
  }

  if (variant === "start") {
    ok(project.currentPhase === 1, `currentPhase should be 1, got ${project.currentPhase}`);
    ok(
      project.pestelRelevance == null ||
        (Array.isArray(project.pestelRelevance) &&
          (project.pestelRelevance as unknown[]).length === 0),
      "start variant should not have pestelRelevance yet"
    );

    const statementCount = await prisma.statement.count({ where: { projectId } });
    const optionCount = await prisma.strategyOption.count({ where: { projectId } });
    const stepCount = await prisma.validationStep.count({ where: { projectId } });
    const feedbackCount = await prisma.marketFeedback.count({ where: { projectId } });
    const adaptationCount = await prisma.adaptationDecision.count({
      where: { projectId },
    });
    const phase2Inputs = await prisma.phaseInput.count({
      where: { projectId, phase: 2 },
    });
    const phase4Inputs = await prisma.phaseInput.count({
      where: { projectId, phase: 4 },
    });

    ok(statementCount === 0, `start should have 0 statements, got ${statementCount}`);
    ok(optionCount === 0, `start should have 0 options, got ${optionCount}`);
    ok(stepCount === 0, `start should have 0 steps, got ${stepCount}`);
    ok(feedbackCount === 0, `start should have 0 feedbacks, got ${feedbackCount}`);
    ok(
      adaptationCount === 0,
      `start should have 0 adaptations, got ${adaptationCount}`
    );
    ok(phase2Inputs === 3, `start should have 3 phase-2 inputs, got ${phase2Inputs}`);
    ok(phase4Inputs === 6, `start should have 6 phase-4 inputs, got ${phase4Inputs}`);

    report();
    if (errors.length === 0) {
      console.log(`DEMO_PROJECT_ID=${projectId}`);
      console.log("DEMO_SEED_VARIANT=start — OK");
    }
    return;
  }

  ok(
    project.currentPhase === (variant === "phase4" ? 4 : 5),
    `currentPhase should be ${variant === "phase4" ? 4 : 5}, got ${project.currentPhase}`
  );

  const phase1Active = await prisma.statement.count({
    where: { projectId, phase: 1, ...ACTIVE_ADOPTED_WHERE },
  });
  ok(phase1Active > 0, "No active adopted phase-1 statements");

  const supersededNeeded = await prisma.statement.count({
    where: {
      projectId,
      phase: { in: [1, 2] },
      adopted: true,
      supersededByStatementId: { not: null },
    },
  });
  ok(
    supersededNeeded === 0,
    `Found ${supersededNeeded} superseded adopted statements in phases 1-2`
  );

  const pestelRelevance = project.pestelRelevance;
  ok(Array.isArray(pestelRelevance), "pestelRelevance missing");
  if (Array.isArray(pestelRelevance)) {
    ok(
      pestelRelevance.length === PESTEL_CATEGORIES.length,
      `pestelRelevance should have ${PESTEL_CATEGORIES.length} entries`
    );
    const political = pestelRelevance.find(
      (e) =>
        e &&
        typeof e === "object" &&
        (e as { category?: string }).category === "PESTEL_POLITICAL"
    ) as { relevant?: boolean } | undefined;
    ok(political?.relevant === false, "PESTEL_POLITICAL should be relevant=false");
  }

  const politicalStatements = await prisma.statement.count({
    where: { projectId, category: "PESTEL_POLITICAL" },
  });
  ok(politicalStatements === 0, `Found ${politicalStatements} POLITICAL statements`);

  const simulatedSources = await prisma.statement.findMany({
    where: { projectId, origin: "SIMULATED_RESEARCH", sourceRef: { not: null } },
    select: { sourceRef: true },
  });
  for (const row of simulatedSources) {
    ok(
      row.sourceRef?.trim().endsWith("(fiktiv)") ?? false,
      `Source missing (fiktiv) suffix: ${row.sourceRef}`
    );
  }

  const segmentLabels = await prisma.statement.findMany({
    where: { projectId, category: "TARGET_SEGMENT", segmentAspect: "WHO_CORE" },
    select: { segmentLabel: true },
  });
  const expectedSegments = [
    "Fitnessorientierte Berufstätige",
    "Zeitknappe gesundheitsbewusste Professionals",
    "Pflanzlich orientierte Convenience-Käufer",
  ];
  for (const label of expectedSegments) {
    ok(
      segmentLabels.some((s) => s.segmentLabel === label),
      `Missing segment label: ${label}`
    );
  }

  const competitorLabels = await prisma.statement.groupBy({
    by: ["competitorLabel"],
    where: { projectId, category: "COMPETITOR", competitorLabel: { not: null } },
  });
  ok(competitorLabels.length >= 10, `Expected >=10 competitors, got ${competitorLabels.length}`);
  for (const group of competitorLabels) {
    const aspects = await prisma.statement.findMany({
      where: {
        projectId,
        category: "COMPETITOR",
        competitorLabel: group.competitorLabel,
      },
      select: { competitorAspect: true },
    });
    ok(
      aspects.length === COMPETITOR_ASPECTS.length,
      `Competitor ${group.competitorLabel} has ${aspects.length} aspects, expected ${COMPETITOR_ASPECTS.length}`
    );
  }

  ok(
    (await prisma.statement.count({ where: { projectId, category: "SWOT_STRENGTH" } })) >= 1,
    "Missing SWOT statements"
  );
  ok(
    (await prisma.statement.count({ where: { projectId, category: "MARKET_PATH" } })) >= 1,
    "Missing market paths"
  );

  const options = await prisma.strategyOption.findMany({
    where: { projectId },
    include: {
      statements: { include: { statement: true } },
      evaluations: true,
    },
    orderBy: { createdAt: "asc" },
  });
  ok(options.length === 3, `Expected 3 options, got ${options.length}`);

  const prioritized = options.filter((o) => o.status === "PRIORITIZED");
  const deferred = options.filter((o) => o.status === "DEFERRED");
  ok(prioritized.length === 1, `Expected 1 PRIORITIZED option, got ${prioritized.length}`);
  ok(deferred.length === 2, `Expected 2 DEFERRED options, got ${deferred.length}`);
  ok(
    Boolean(prioritized[0]?.prioritizationRationale?.trim()),
    "Prioritized option missing prioritizationRationale"
  );

  for (const option of options) {
    const categories = new Set(
      option.statements.map((link) => link.statement.category)
    );
    for (const dim of OPTION_DIMENSION_CATEGORIES) {
      ok(categories.has(dim), `Option ${option.title} missing dimension ${dim}`);
    }
    for (const link of option.statements) {
      ok(link.statement.adopted === true, `Option statement not adopted: ${link.statement.id}`);
    }
    const optTarget = option.statements.find(
      (l) => l.statement.category === "OPT_TARGET_GROUP"
    )?.statement.segmentLabel;
    if (optTarget) {
      const phase1Match = await prisma.statement.findFirst({
        where: {
          projectId,
          phase: 1,
          category: "TARGET_SEGMENT",
          segmentAspect: "WHO_CORE",
          segmentLabel: optTarget,
          ...ACTIVE_ADOPTED_WHERE,
        },
      });
      ok(Boolean(phase1Match), `OPT_TARGET_GROUP segmentLabel mismatch: ${optTarget}`);
    }
  }

  const evaluations = options.flatMap((o) => o.evaluations);
  ok(evaluations.length === 18, `Expected 18 evaluations, got ${evaluations.length}`);
  for (const option of options) {
    for (const criterion of Object.values(Criterion)) {
      const matches = option.evaluations.filter((e) => e.criterion === criterion);
      ok(
        matches.length === 1,
        `Option ${option.title}: expected 1 ${criterion}, got ${matches.length}`
      );
      const score = matches[0]?.score;
      ok(score !== undefined && score >= 1 && score <= 5, `Invalid score for ${criterion}`);
    }
  }

  const steps = await prisma.validationStep.findMany({
    where: { projectId, adopted: true, discardedAt: null },
    include: {
      assumption: true,
      metrics: { include: { dataPoints: true } },
      tasks: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { createdAt: "asc" },
  });
  const expectedSteps = Object.keys(DEMO_FIXTURE.validationSteps).length;
  ok(steps.length === expectedSteps, `Expected ${expectedSteps} validation steps, got ${steps.length}`);

  for (const step of steps) {
    ok(step.adopted === true, `Step ${step.title} not adopted`);
    ok(step.discardedAt === null, `Step ${step.title} is discarded`);
    ok(step.assumption.isCritical === true, `Assumption not critical for ${step.title}`);
    ok(
      step.assumption.adopted === true && step.assumption.supersededByStatementId === null,
      `Assumption inactive for ${step.title}`
    );
    ok(
      step.assumption.evidenceStatus === "ASSUMPTION" ||
        step.assumption.evidenceStatus === "OPEN_QUESTION" ||
        step.assumption.evidenceStatus === "FACT",
      `Unexpected assumption evidence for ${step.title}`
    );

    const decisive = step.metrics.filter((m) => m.metricRole === "DECISIVE");
    ok(decisive.length >= 1, `Step ${step.title} missing DECISIVE metric`);

    ok(step.tasks.length >= 5, `Step ${step.title} has too few tasks (${step.tasks.length})`);
    const sortOrders = step.tasks.map((t) => t.sortOrder);
    ok(
      new Set(sortOrders).size === sortOrders.length,
      `Duplicate task sortOrder in ${step.title}`
    );

    for (const task of step.tasks) {
      if (task.elaboration) {
        const parsed = taskElaborationResponseSchema.safeParse(task.elaboration);
        ok(parsed.success, `Invalid elaboration JSON on task ${task.title}`);
      }
    }

    for (const metric of step.metrics) {
      const fixtureMetric = Object.values(DEMO_FIXTURE.metrics).find(
        (m) => m.name === metric.name
      );
      const expectedKpiCount = fixtureMetric?.kpiPointKeys.length ?? 0;
      if (expectedKpiCount > 0) {
        ok(
          metric.dataPoints.length === expectedKpiCount,
          `Metric ${metric.name} expected ${expectedKpiCount} KPI points, got ${metric.dataPoints.length}`
        );
      }
      for (const point of metric.dataPoints) {
        ok(Boolean(point.periodLabel), `KPI missing periodLabel on ${metric.name}`);
        if (metric.valueType === "COUNT_OF_TOTAL") {
          ok(
            point.value === null,
            `COUNT_OF_TOTAL ${metric.name} must not use value`
          );
          ok(
            point.numerator !== null && point.denominator !== null,
            `COUNT_OF_TOTAL ${metric.name} needs numerator and denominator`
          );
          if (point.numerator !== null && point.denominator !== null) {
            ok(
              point.denominator > 0,
              `Invalid denominator on ${metric.name}`
            );
            ok(
              point.numerator >= 0 && point.numerator <= point.denominator,
              `Invalid numerator on ${metric.name}`
            );
          }
        } else {
          ok(
            point.value !== null ||
              (point.numerator !== null && point.denominator !== null),
            `KPI has no structured value on ${metric.name}`
          );
        }
      }
    }
  }

  const nourivaMetric = steps
    .flatMap((step) => step.metrics)
    .find(
      (metric) =>
        metric.name ===
        "Befragte mit eigenständig genanntem wiederkehrendem Meal-Prep-Problem"
    );
  ok(Boolean(nourivaMetric), "Nouriva interview metric is missing");
  if (nourivaMetric) {
    const result = aggregateMetric(nourivaMetric, nourivaMetric.dataPoints);
    ok(result.isValid, "Nouriva aggregation must be valid");
    ok(result.numerator === 14, `Nouriva numerator should be 14, got ${result.numerator}`);
    ok(result.denominator === 18, `Nouriva denominator should be 18, got ${result.denominator}`);
    ok(
      result.percentage !== undefined &&
        Math.abs(result.percentage - 77.7777777778) < 0.01,
      `Nouriva percentage should be about 77.8, got ${result.percentage}`
    );
    ok(result.assessment === "SUPPORTING", `Nouriva assessment should be SUPPORTING, got ${result.assessment}`);
    ok(result.periodCount === 3, `Nouriva should have 3 waves, got ${result.periodCount}`);
    ok(
      !nourivaMetric.dataPoints.some(
        (point) =>
          (point.numerator === 8 && point.denominator === 12) ||
          (point.numerator === 14 && point.denominator === 18)
      ),
      "Nouriva must not store cumulative snapshots as period values"
    );
    const summary = buildKpiFeedbackSummary([nourivaMetric]);
    ok(summary.includes("14 von 18 Befragten (77,8 %)"), "Phase-5 summary must contain 14 of 18 and 77.8%");
    ok(!summary.includes("40 von 6"), "Phase-5 summary contains 40 von 6");
    ok(!summary.includes("kumuliert 40"), "Phase-5 summary contains kumuliert 40");
  }

  const reservationMetric = steps
    .flatMap((step) => step.metrics)
    .find(
      (metric) =>
        metric.name === "Bezahlte Reservierungsrate bei 10,90 Euro je Mahlzeit"
    );
  ok(Boolean(reservationMetric), "Reservation metric is missing");
  if (reservationMetric) {
    const result = aggregateMetric(reservationMetric, reservationMetric.dataPoints);
    ok(result.periodCount === 1, `Reservation metric should have 1 period, got ${result.periodCount}`);
    ok(
      result.percentage !== undefined && Math.abs(result.percentage - 10) < 0.01,
      `Reservation Gesamtergebnis should be 10%, got ${result.percentage}`
    );
    ok(
      result.assessment === "SUPPORTING",
      `Reservation assessment should be SUPPORTING, got ${result.assessment}`
    );
    ok(
      !reservationMetric.dataPoints.some((point) => point.value === "13.3"),
      "Reservation metric must not contain the 9.90 Euro rate as a data point"
    );
  }

  const nonRepurchaseMetric = steps
    .flatMap((step) => step.metrics)
    .find(
      (metric) =>
        metric.name ===
        "Nicht-Wiederkäufer mit klar zuordenbarem Ablehnungsgrund"
    );
  ok(Boolean(nonRepurchaseMetric), "Non-repurchase reason metric is missing");
  if (nonRepurchaseMetric) {
    const result = aggregateMetric(
      nonRepurchaseMetric,
      nonRepurchaseMetric.dataPoints
    );
    ok(result.numerator === 18, `Non-repurchase numerator should be 18, got ${result.numerator}`);
    ok(
      result.denominator === 22,
      `Non-repurchase denominator should be 22 (Nicht-Wiederkäufer), got ${result.denominator}`
    );
    ok(
      result.assessment === "SUPPORTING",
      `Non-repurchase assessment should be SUPPORTING, got ${result.assessment}`
    );
  }

  const feedbacks = await prisma.marketFeedback.findMany({
    where: { projectId },
    include: { step: true, statement: true },
  });
  const learningCount = await prisma.statement.count({
    where: { projectId, phase: 5, category: StatementCategory.LEARNING, adopted: true },
  });
  if (variant === "full") {
    ok(
      feedbacks.length === Object.keys(DEMO_FIXTURE.feedbacks).length,
      `Expected ${Object.keys(DEMO_FIXTURE.feedbacks).length} feedbacks, got ${feedbacks.length}`
    );
    for (const feedback of feedbacks) {
      ok(Boolean(feedback.interpretation?.trim()), "MarketFeedback missing interpretation");
      ok(
        feedback.statementId === feedback.step?.assumptionId,
        "MarketFeedback.statementId must match step assumption"
      );
      ok(!feedback.content.includes("40 von 6"), "MarketFeedback contains 40 von 6");
      ok(!feedback.content.includes("kumuliert 40"), "MarketFeedback contains kumuliert 40");
    }

    ok(learningCount >= 4, `Expected >=4 LEARNING statements, got ${learningCount}`);

    const adaptation = await prisma.adaptationDecision.findFirst({
      where: { projectId, userConfirmed: true },
      orderBy: { createdAt: "desc" },
    });
    ok(Boolean(adaptation), "Missing confirmed AdaptationDecision");
    if (adaptation) {
      ok(adaptation.decision === "ADAPT", `Expected ADAPT, got ${adaptation.decision}`);
      ok(adaptation.userConfirmed === true, "AdaptationDecision not confirmed");
      ok(Boolean(adaptation.rationale?.trim()), "AdaptationDecision missing rationale");
    }
  } else if (variant === "phase5") {
    ok(feedbacks.length === 0, `Expected 0 feedbacks, got ${feedbacks.length}`);
    ok(learningCount === 0, `Expected 0 LEARNING statements, got ${learningCount}`);
    const adaptationCount = await prisma.adaptationDecision.count({
      where: { projectId },
    });
    ok(adaptationCount === 0, `Expected 0 adaptation decisions, got ${adaptationCount}`);

    const customerProblem = await prisma.statement.findFirst({
      where: {
        projectId,
        category: StatementCategory.OPT_CUSTOMER_PROBLEM,
        adopted: true,
        content: {
          contains: "Regelmäßiges Meal Prep bindet Zeit und Planung",
        },
      },
      select: { evidenceStatus: true },
    });
    ok(
      customerProblem?.evidenceStatus === "ASSUMPTION",
      "Customer-problem assumption should remain ASSUMPTION before Phase-5 evaluation"
    );
  } else {
    ok(feedbacks.length === 0, `Expected 0 feedbacks in phase4 variant, got ${feedbacks.length}`);
    ok(learningCount === 0, `Expected 0 LEARNING statements in phase4 variant, got ${learningCount}`);
    const adaptationCount = await prisma.adaptationDecision.count({
      where: { projectId },
    });
    ok(
      adaptationCount === 0,
      `Expected 0 adaptation decisions in phase4 variant, got ${adaptationCount}`
    );
  }

  report(projectId, {
    statements: await prisma.statement.count({ where: { projectId } }),
    options: options.length,
    evaluations: evaluations.length,
    steps: steps.length,
    metrics: steps.reduce((n, s) => n + s.metrics.length, 0),
    tasks: steps.reduce((n, s) => n + s.tasks.length, 0),
    kpiPoints: steps.reduce(
      (n, s) => n + s.metrics.reduce((m, metric) => m + metric.dataPoints.length, 0),
      0
    ),
    feedbacks: feedbacks.length,
    learning: learningCount,
    adaptations: await prisma.adaptationDecision.count({ where: { projectId } }),
  });
}

function report(
  projectId?: string,
  counts?: Record<string, number>
) {
  if (errors.length > 0) {
    console.error("Demo validation FAILED:\n");
    for (const error of errors) {
      console.error(`  ✗ ${error}`);
    }
    process.exit(1);
  }

  console.log("Demo validation PASSED");
  if (projectId) console.log(`DEMO_PROJECT_ID=${projectId}`);
  if (counts) {
    console.log("Counts:");
    for (const [key, value] of Object.entries(counts)) {
      console.log(`  ${key}: ${value}`);
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
