-- CreateEnum
CREATE TYPE "StudioDataImportStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "StudioDataImport" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "status" "StudioDataImportStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB NOT NULL,
    "entities" JSONB NOT NULL,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioDataImport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudioDataImport_studioId_createdAt_idx" ON "StudioDataImport"("studioId", "createdAt");

-- AddForeignKey
ALTER TABLE "StudioDataImport" ADD CONSTRAINT "StudioDataImport_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioDataImport" ADD CONSTRAINT "StudioDataImport_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
