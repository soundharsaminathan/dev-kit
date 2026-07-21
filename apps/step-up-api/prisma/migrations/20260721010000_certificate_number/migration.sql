-- AlterTable
ALTER TABLE "ContestCertificate" ADD COLUMN "certificateNumber" TEXT;

-- Backfill existing rows with deterministic placeholders before enforcing NOT NULL
UPDATE "ContestCertificate"
SET "certificateNumber" = 'LEGACY-' || "id"
WHERE "certificateNumber" IS NULL;

ALTER TABLE "ContestCertificate" ALTER COLUMN "certificateNumber" SET NOT NULL;

CREATE UNIQUE INDEX "ContestCertificate_certificateNumber_key" ON "ContestCertificate"("certificateNumber");

CREATE INDEX "ContestCertificate_certificateNumber_idx" ON "ContestCertificate"("certificateNumber");
