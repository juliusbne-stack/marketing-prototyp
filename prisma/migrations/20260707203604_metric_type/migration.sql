-- CreateEnum
CREATE TYPE "MetricType" AS ENUM ('RATE', 'CUMULATIVE');

-- AlterTable
ALTER TABLE "Metric" ADD COLUMN     "metricType" "MetricType" NOT NULL DEFAULT 'RATE';
