-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "periodStart" TIMESTAMP(3);
ALTER TABLE "Invoice" ADD COLUMN "periodEnd" TIMESTAMP(3);

-- Backfill from the linked membership billing period (not paidAt).
UPDATE "Invoice" AS i
SET
  "periodStart" = date_trunc('month', m."periodStart"),
  "periodEnd" = m."periodEnd"
FROM "Membership" AS m
WHERE i."membershipId" = m.id;

-- CreateIndex
CREATE INDEX "Invoice_studioId_periodStart_idx" ON "Invoice"("studioId", "periodStart");
