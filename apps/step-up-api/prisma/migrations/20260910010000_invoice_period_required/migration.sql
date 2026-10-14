-- Finish backfill so every invoice has a stored billing period, then require it.

UPDATE "Invoice" AS i
SET
  "periodStart" = date_trunc('month', m."periodStart"),
  "periodEnd" = m."periodEnd"
FROM "Membership" AS m
WHERE i."membershipId" = m.id
  AND (i."periodStart" IS NULL OR i."periodEnd" IS NULL);

UPDATE "Invoice"
SET
  "periodEnd" = (
    date_trunc('month', "periodStart")
    + INTERVAL '1 month'
    - INTERVAL '1 millisecond'
  )
WHERE "periodStart" IS NOT NULL AND "periodEnd" IS NULL;

-- Leftover checkout/hold rows with no membership: stamp a calendar month so
-- the columns can be NOT NULL. Display still reads these stored columns, never paidAt.
UPDATE "Invoice"
SET
  "periodStart" = date_trunc(
    'month',
    COALESCE("paidAt", "paymentHoldExpiresAt", CURRENT_TIMESTAMP)
  ),
  "periodEnd" = date_trunc(
    'month',
    COALESCE("paidAt", "paymentHoldExpiresAt", CURRENT_TIMESTAMP)
  ) + INTERVAL '1 month' - INTERVAL '1 millisecond'
WHERE "periodStart" IS NULL;

ALTER TABLE "Invoice" ALTER COLUMN "periodStart" SET NOT NULL;
ALTER TABLE "Invoice" ALTER COLUMN "periodEnd" SET NOT NULL;
