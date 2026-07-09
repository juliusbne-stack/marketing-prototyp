-- CreateEnum
CREATE TYPE "Laufmodus" AS ENUM ('PARALLEL', 'NACHGELAGERT', 'EIGENSTAENDIG');

-- CreateEnum
CREATE TYPE "TaskHerkunft" AS ENUM ('NEU', 'GETEILT', 'BEREITS_ERFUELLT');

-- AlterTable
ALTER TABLE "ValidationStep" ADD COLUMN "laufmodus" "Laufmodus" NOT NULL DEFAULT 'EIGENSTAENDIG';
ALTER TABLE "ValidationStep" ADD COLUMN "basiertAufUmsetzungId" TEXT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN "herkunft" "TaskHerkunft" NOT NULL DEFAULT 'NEU';
ALTER TABLE "Task" ADD COLUMN "erfuelltDurchUmsetzungId" TEXT;

-- AddForeignKey
ALTER TABLE "ValidationStep" ADD CONSTRAINT "ValidationStep_basiertAufUmsetzungId_fkey" FOREIGN KEY ("basiertAufUmsetzungId") REFERENCES "ValidationStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_erfuelltDurchUmsetzungId_fkey" FOREIGN KEY ("erfuelltDurchUmsetzungId") REFERENCES "ValidationStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;
