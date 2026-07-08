-- AlterTable
ALTER TABLE "Project" ADD COLUMN "profileOnboardingComplete" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Project" ADD COLUMN "profileOnboardingStep" INTEGER NOT NULL DEFAULT 0;

-- Bestandsprojekte mit bereits ausgefülltem Profil überspringen den Wizard
UPDATE "Project" SET "profileOnboardingComplete" = true WHERE "businessIdea" IS NOT NULL;
