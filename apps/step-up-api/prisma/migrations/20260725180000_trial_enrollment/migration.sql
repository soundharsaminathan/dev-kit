-- AlterTable
ALTER TABLE "Batch" DROP COLUMN "isTrial";

-- AlterTable
ALTER TABLE "BatchEnrollment" ADD COLUMN "isTrial" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "BatchEnrollment" ADD COLUMN "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "BatchEnrollment" ADD COLUMN "trialSessionIds" JSONB;
