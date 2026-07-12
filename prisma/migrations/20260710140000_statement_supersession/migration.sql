-- AlterTable
ALTER TABLE "Statement" ADD COLUMN "supersededByStatementId" TEXT;

-- AddForeignKey
ALTER TABLE "Statement" ADD CONSTRAINT "Statement_supersededByStatementId_fkey" FOREIGN KEY ("supersededByStatementId") REFERENCES "Statement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
