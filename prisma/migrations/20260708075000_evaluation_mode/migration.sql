-- CreateEnum
CREATE TYPE "EvaluationMode" AS ENUM ('PER_POINT', 'CUMULATIVE');

-- AlterTable: add evaluationMode, migrate from metricType, drop metricType
ALTER TABLE "Metric" ADD COLUMN "evaluationMode" "EvaluationMode" NOT NULL DEFAULT 'PER_POINT';

UPDATE "Metric" SET "evaluationMode" = 'CUMULATIVE' WHERE "metricType" = 'CUMULATIVE';

ALTER TABLE "Metric" DROP COLUMN "metricType";

-- DropEnum
DROP TYPE "MetricType";
