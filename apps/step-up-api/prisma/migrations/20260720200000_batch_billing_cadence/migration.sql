-- CreateEnum
CREATE TYPE "BillingCadence" AS ENUM ('MONTHLY', 'FULL_BATCH');

-- AlterTable Plan
ALTER TABLE "Plan" ADD COLUMN "billingCadence" "BillingCadence" NOT NULL DEFAULT 'MONTHLY';

-- AlterTable Batch: add dual plan FKs
ALTER TABLE "Batch" ADD COLUMN "monthlyPlanId" TEXT;
ALTER TABLE "Batch" ADD COLUMN "fullBatchPlanId" TEXT;

-- Migrate existing planId → monthlyPlanId
UPDATE "Batch" SET "monthlyPlanId" = "planId" WHERE "planId" IS NOT NULL;

-- Drop old planId FK and column
ALTER TABLE "Batch" DROP CONSTRAINT IF EXISTS "Batch_planId_fkey";
DROP INDEX IF EXISTS "Batch_planId_idx";
ALTER TABLE "Batch" DROP COLUMN "planId";

-- Add new FKs
ALTER TABLE "Batch"
ADD CONSTRAINT "Batch_monthlyPlanId_fkey"
FOREIGN KEY ("monthlyPlanId") REFERENCES "Plan"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Batch"
ADD CONSTRAINT "Batch_fullBatchPlanId_fkey"
FOREIGN KEY ("fullBatchPlanId") REFERENCES "Plan"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Batch_monthlyPlanId_idx" ON "Batch"("monthlyPlanId");
CREATE INDEX "Batch_fullBatchPlanId_idx" ON "Batch"("fullBatchPlanId");
