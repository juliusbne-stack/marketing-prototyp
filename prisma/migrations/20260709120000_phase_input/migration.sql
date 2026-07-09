-- CreateTable
CREATE TABLE "PhaseInput" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "phase" INTEGER NOT NULL,
    "questionKey" TEXT NOT NULL,
    "value" JSONB,
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhaseInput_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PhaseInput_projectId_phase_idx" ON "PhaseInput"("projectId", "phase");

-- CreateIndex
CREATE UNIQUE INDEX "PhaseInput_projectId_phase_questionKey_key" ON "PhaseInput"("projectId", "phase", "questionKey");

-- AddForeignKey
ALTER TABLE "PhaseInput" ADD CONSTRAINT "PhaseInput_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
