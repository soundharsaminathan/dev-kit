-- Soft-status enrollments (unenroll keeps history) + refunded invoices.

CREATE TYPE "BatchEnrollmentStatus" AS ENUM ('ACTIVE', 'ENDED');

ALTER TYPE "InvoiceStatus" ADD VALUE 'REFUNDED';

ALTER TABLE "BatchEnrollment"
ADD COLUMN "status" "BatchEnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "endedAt" TIMESTAMP(3),
ADD COLUMN "endReason" TEXT;

CREATE INDEX "BatchEnrollment_batchId_status_idx" ON "BatchEnrollment"("batchId", "status");
CREATE INDEX "BatchEnrollment_studentId_status_idx" ON "BatchEnrollment"("studentId", "status");
