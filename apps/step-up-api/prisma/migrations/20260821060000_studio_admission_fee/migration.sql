-- AlterEnum
ALTER TYPE "InvoiceChargeType" ADD VALUE 'ADMISSION';

-- AlterTable
ALTER TABLE "StudioSettings" ADD COLUMN "admissionFee" DECIMAL(10,2) NOT NULL DEFAULT 0;
