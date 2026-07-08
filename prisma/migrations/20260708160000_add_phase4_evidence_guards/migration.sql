-- CreateEnum
CREATE TYPE "StepType" AS ENUM ('VALIDATION', 'SCALING');

-- CreateEnum
CREATE TYPE "StrategyDimension" AS ENUM ('TARGET_GROUP', 'CUSTOMER_PROBLEM', 'VALUE_PROPOSITION', 'POSITIONING', 'MARKET_ACCESS', 'REVENUE_GROWTH');

-- CreateEnum
CREATE TYPE "TestSubject" AS ENUM ('WILLINGNESS_TO_PAY', 'REACHABILITY', 'PROBLEM_RELEVANCE', 'VALUE_UNDERSTANDING', 'DIFFERENTIATION', 'REVENUE_MECHANICS', 'OTHER');

-- CreateEnum
CREATE TYPE "SignalCategory" AS ENUM ('COMMITMENT', 'BEHAVIOR', 'ATTENTION', 'QUALITATIVE');

-- AlterTable
ALTER TABLE "ValidationStep" ADD COLUMN     "stepType" "StepType" NOT NULL DEFAULT 'VALIDATION',
ADD COLUMN     "strategyDimension" "StrategyDimension",
ADD COLUMN     "testSubject" "TestSubject",
ADD COLUMN     "methodWarning" TEXT;

-- AlterTable
ALTER TABLE "Metric" ADD COLUMN     "signalCategory" "SignalCategory";
