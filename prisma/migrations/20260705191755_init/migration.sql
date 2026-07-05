-- CreateEnum
CREATE TYPE "EvidenceStatus" AS ENUM ('FACT', 'ASSUMPTION', 'OPEN_QUESTION');

-- CreateEnum
CREATE TYPE "Origin" AS ENUM ('USER_INPUT', 'SIMULATED_RESEARCH', 'AI_DERIVATION');

-- CreateEnum
CREATE TYPE "StatementCategory" AS ENUM ('PESTEL_POLITICAL', 'PESTEL_ECONOMIC', 'PESTEL_SOCIAL', 'PESTEL_TECHNOLOGICAL', 'PESTEL_ECOLOGICAL', 'PESTEL_LEGAL', 'TARGET_SEGMENT', 'CUSTOMER_PROBLEM', 'COMPETITOR', 'RESOURCE', 'SWOT_STRENGTH', 'SWOT_WEAKNESS', 'SWOT_OPPORTUNITY', 'SWOT_THREAT', 'MARKET_PATH', 'OPT_TARGET_GROUP', 'OPT_CUSTOMER_PROBLEM', 'OPT_VALUE_PROPOSITION', 'OPT_POSITIONING', 'OPT_MARKET_ACCESS', 'OPT_REVENUE_GROWTH', 'LEARNING', 'OTHER');

-- CreateEnum
CREATE TYPE "OptionStatus" AS ENUM ('DRAFT', 'ADOPTED', 'PRIORITIZED', 'DEFERRED', 'DISCARDED');

-- CreateEnum
CREATE TYPE "Criterion" AS ENUM ('ATTRACTIVENESS', 'RESOURCE_FIT', 'RISK', 'VALIDATION_EFFORT', 'LEARNING_VALUE', 'EVIDENCE');

-- CreateEnum
CREATE TYPE "FeedbackResult" AS ENUM ('SUPPORTED', 'PARTIALLY_SUPPORTED', 'REFUTED', 'AMBIGUOUS');

-- CreateEnum
CREATE TYPE "AdaptationType" AS ENUM ('CONTINUE', 'ADAPT', 'DEFER', 'DISCARD', 'LOOP_BACK');

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currentPhase" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "businessIdea" TEXT,
    "productStatus" TEXT,
    "assumedTarget" TEXT,
    "assumedProblem" TEXT,
    "valuePropDraft" TEXT,
    "revenueIdea" TEXT,
    "region" TEXT,
    "teamSize" INTEGER,
    "budgetMonthly" TEXT,
    "timePerWeek" TEXT,
    "skills" TEXT,
    "existingInsights" TEXT,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Statement" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "phase" INTEGER NOT NULL,
    "category" "StatementCategory" NOT NULL DEFAULT 'OTHER',
    "content" TEXT NOT NULL,
    "evidenceStatus" "EvidenceStatus" NOT NULL,
    "origin" "Origin" NOT NULL,
    "justification" TEXT,
    "sourceRef" TEXT,
    "uncertainty" TEXT,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "adopted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Statement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategyOption" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "status" "OptionStatus" NOT NULL DEFAULT 'DRAFT',
    "prioritizationRationale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategyOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptionStatement" (
    "optionId" TEXT NOT NULL,
    "statementId" TEXT NOT NULL,

    CONSTRAINT "OptionStatement_pkey" PRIMARY KEY ("optionId","statementId")
);

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "criterion" "Criterion" NOT NULL,
    "score" INTEGER NOT NULL,
    "rationale" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValidationStep" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "assumptionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "channel" TEXT,
    "adopted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ValidationStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Metric" (
    "id" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "successCriterion" TEXT NOT NULL,
    "failureCriterion" TEXT NOT NULL,

    CONSTRAINT "Metric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketFeedback" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "stepId" TEXT,
    "statementId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "result" "FeedbackResult" NOT NULL,
    "interpretation" TEXT,
    "proposedNewStatus" "EvidenceStatus",
    "statusApplied" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdaptationDecision" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "decision" "AdaptationType" NOT NULL,
    "rationale" TEXT NOT NULL,
    "loopBackToPhase" INTEGER,
    "userConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdaptationDecision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Evaluation_optionId_criterion_key" ON "Evaluation"("optionId", "criterion");

-- AddForeignKey
ALTER TABLE "Statement" ADD CONSTRAINT "Statement_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategyOption" ADD CONSTRAINT "StrategyOption_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptionStatement" ADD CONSTRAINT "OptionStatement_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "StrategyOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptionStatement" ADD CONSTRAINT "OptionStatement_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "Statement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "StrategyOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationStep" ADD CONSTRAINT "ValidationStep_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationStep" ADD CONSTRAINT "ValidationStep_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "StrategyOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationStep" ADD CONSTRAINT "ValidationStep_assumptionId_fkey" FOREIGN KEY ("assumptionId") REFERENCES "Statement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Metric" ADD CONSTRAINT "Metric_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "ValidationStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketFeedback" ADD CONSTRAINT "MarketFeedback_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketFeedback" ADD CONSTRAINT "MarketFeedback_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "ValidationStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketFeedback" ADD CONSTRAINT "MarketFeedback_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "Statement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdaptationDecision" ADD CONSTRAINT "AdaptationDecision_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdaptationDecision" ADD CONSTRAINT "AdaptationDecision_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "StrategyOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
