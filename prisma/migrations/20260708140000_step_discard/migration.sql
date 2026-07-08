-- AlterTable: soft discard for adopted validation steps (keeps cockpit history intact)
ALTER TABLE "ValidationStep" ADD COLUMN "discardedAt" TIMESTAMP(3);
