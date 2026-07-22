-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('BEGINNER', 'SOME_EXPERIENCE', 'INTERMEDIATE', 'ADVANCED');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "experienceLevel" "ExperienceLevel",
ADD COLUMN "scheduleVibe" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "preferredBranchId" TEXT,
ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);

-- Backfill existing students so they are not forced through onboarding
UPDATE "User"
SET "onboardingCompletedAt" = COALESCE("updatedAt", "createdAt", NOW())
WHERE "role" = 'STUDENT'
  AND "onboardingCompletedAt" IS NULL
  AND cardinality("styles") > 0;

-- AddForeignKey
ALTER TABLE "User"
ADD CONSTRAINT "User_preferredBranchId_fkey"
FOREIGN KEY ("preferredBranchId") REFERENCES "StudioBranch"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "User_preferredBranchId_idx" ON "User"("preferredBranchId");
