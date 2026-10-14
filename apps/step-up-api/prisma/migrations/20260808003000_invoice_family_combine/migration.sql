-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "familyDiscount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN "combineMeta" JSONB;
