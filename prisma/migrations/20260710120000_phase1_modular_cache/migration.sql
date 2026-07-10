-- CreateTable
CREATE TABLE "Phase1ModuleCache" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Phase1ModuleCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Phase1Run" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizedAt" TIMESTAMP(3),

    CONSTRAINT "Phase1Run_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Phase1ModuleCache_projectId_idx" ON "Phase1ModuleCache"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Phase1ModuleCache_projectId_moduleKey_key" ON "Phase1ModuleCache"("projectId", "moduleKey");

-- CreateIndex
CREATE UNIQUE INDEX "Phase1Run_runId_key" ON "Phase1Run"("runId");

-- CreateIndex
CREATE INDEX "Phase1Run_projectId_idx" ON "Phase1Run"("projectId");

-- AddForeignKey
ALTER TABLE "Phase1ModuleCache" ADD CONSTRAINT "Phase1ModuleCache_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Phase1Run" ADD CONSTRAINT "Phase1Run_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
