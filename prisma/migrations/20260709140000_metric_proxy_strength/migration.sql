-- CreateEnum
CREATE TYPE "ProxyStrength" AS ENUM ('DIRECT', 'PROXY');

-- AlterTable
ALTER TABLE "Metric" ADD COLUMN "proxyStrength" "ProxyStrength",
ADD COLUMN "signalRationale" TEXT;
