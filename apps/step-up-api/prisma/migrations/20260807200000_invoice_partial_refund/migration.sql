-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "refundedAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN "refundedAt" TIMESTAMP(3);
