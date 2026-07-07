-- AlterTable: task elaboration + assumption reference fields
ALTER TABLE "Task" ADD COLUMN "annahmenBezugId" TEXT;
ALTER TABLE "Task" ADD COLUMN "erfolgskriterium" TEXT;
ALTER TABLE "Task" ADD COLUMN "elaboration" JSONB;
ALTER TABLE "Task" ADD COLUMN "elaborationGeneratedAt" TIMESTAMP(3);
ALTER TABLE "Task" ADD COLUMN "elaborationModel" TEXT;

ALTER TABLE "Task" ADD CONSTRAINT "Task_annahmenBezugId_fkey" FOREIGN KEY ("annahmenBezugId") REFERENCES "Statement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
