/**
 * Read-only audit for KPI rows that cannot be evaluated under the structured model.
 * It deliberately does not parse or rewrite free-text values.
 */
import { prisma } from "../lib/prisma";
import { aggregateMetric } from "../lib/metrics/aggregateMetric";

async function main() {
  const metrics = await prisma.metric.findMany({
    where: { dataPoints: { some: {} } },
    include: {
      step: { select: { projectId: true, title: true } },
      dataPoints: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      },
    },
  });

  let issueCount = 0;
  for (const metric of metrics) {
    const result = aggregateMetric(metric, metric.dataPoints);
    if (result.isValid && metric.valueType && metric.aggregationStrategy) {
      continue;
    }
    issueCount++;
    console.log(
      JSON.stringify(
        {
          projectId: metric.step.projectId,
          stepId: metric.stepId,
          stepTitle: metric.step.title,
          metricId: metric.id,
          metricName: metric.name,
          valueType: metric.valueType,
          aggregationStrategy: metric.aggregationStrategy,
          errors:
            result.errors.length > 0
              ? result.errors
              : [
                  "Wertart oder Aggregationsstrategie fehlt; Legacy-Daten wurden nicht automatisch umgedeutet.",
                ],
          dataPoints: metric.dataPoints.map((point) => ({
            id: point.id,
            periodLabel: point.periodLabel,
            value: point.value,
            numerator: point.numerator,
            denominator: point.denominator,
          })),
        },
        null,
        2
      )
    );
  }

  console.log(
    `KPI audit completed: ${metrics.length} metrics checked, ${issueCount} require review.`
  );
  if (issueCount > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
