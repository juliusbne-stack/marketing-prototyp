-- Structured KPI semantics: value type, aggregation and machine-readable evaluation.
CREATE TYPE "MetricValueType" AS ENUM (
  'SCALAR',
  'COUNT',
  'COUNT_OF_TOTAL',
  'PERCENTAGE',
  'CURRENCY',
  'DURATION',
  'SCORE'
);

CREATE TYPE "AggregationStrategy" AS ENUM (
  'SUM',
  'LATEST',
  'AVERAGE',
  'RATE_FROM_SUMS',
  'NONE'
);

ALTER TYPE "KpiAssessment" ADD VALUE IF NOT EXISTS 'PENDING';

ALTER TABLE "Metric"
  ADD COLUMN "valueType" "MetricValueType",
  ADD COLUMN "aggregationStrategy" "AggregationStrategy",
  ADD COLUMN "evaluationConfig" JSONB,
  ADD COLUMN "numeratorLabel" TEXT,
  ADD COLUMN "denominatorLabel" TEXT,
  ADD COLUMN "observationUnit" TEXT;

ALTER TABLE "KpiDataPoint"
  ALTER COLUMN "value" DROP NOT NULL,
  ADD COLUMN "numerator" DOUBLE PRECISION,
  ADD COLUMN "denominator" DOUBLE PRECISION;

ALTER TABLE "KpiDataPoint"
  ADD CONSTRAINT "KpiDataPoint_structured_value_check"
  CHECK (
    ("numerator" IS NULL AND "denominator" IS NULL)
    OR
    (
      "value" IS NULL
      AND "numerator" IS NOT NULL
      AND "denominator" IS NOT NULL
      AND "numerator" >= 0
      AND "denominator" > 0
      AND "numerator" <= "denominator"
    )
  );
