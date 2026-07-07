-- CreateEnum
CREATE TYPE "KpiAssessment" AS ENUM ('SUPPORTING', 'NEUTRAL', 'CONTRADICTING');

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "hint" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiDataPoint" (
    "id" TEXT NOT NULL,
    "metricId" TEXT NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "assessment" "KpiAssessment" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KpiDataPoint_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "ValidationStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiDataPoint" ADD CONSTRAINT "KpiDataPoint_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "Metric"("id") ON DELETE CASCADE ON UPDATE CASCADE;
