-- CreateEnum
CREATE TYPE "MembershipBillingPhase" AS ENUM ('FIRST_POSTPAID', 'PREPAID');

-- CreateEnum
CREATE TYPE "InvoiceChargeType" AS ENUM ('POSTPAID_PRORATED', 'PREPAID_FULL');

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "billingPhase" "MembershipBillingPhase" NOT NULL DEFAULT 'PREPAID';
ALTER TABLE "Membership" ADD COLUMN     "batchId" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "chargeType" "InvoiceChargeType" NOT NULL DEFAULT 'PREPAID_FULL';
ALTER TABLE "Invoice" ADD COLUMN     "attendedSessionCount" INTEGER;
ALTER TABLE "Invoice" ADD COLUMN     "billedSessionCount" INTEGER;

-- CreateIndex
CREATE INDEX "Membership_batchId_status_idx" ON "Membership"("batchId", "status");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
