-- One-time: advance legacy postpaid DUE/EXPIRED rows so period dates match the
-- prepaid period being billed (next month/quarter after the completed periodEnd).
-- Skip when a membership for that next period already exists for the same
-- purchaser + subscription.

UPDATE "Membership" AS m
SET
  "periodStart" = calc.next_start,
  "periodEnd" = calc.next_end
FROM (
  SELECT
    m2.id,
    date_trunc('month', m2."periodEnd" + interval '1 day') AS next_start,
    CASE
      WHEN s."billingCadence" = 'QUARTERLY' THEN
        (
          date_trunc('month', m2."periodEnd" + interval '1 day')
          + interval '3 months'
          - interval '1 millisecond'
        )
      ELSE
        (
          date_trunc('month', m2."periodEnd" + interval '1 day')
          + interval '1 month'
          - interval '1 millisecond'
        )
    END AS next_end,
    s."billingCadence" AS cadence
  FROM "Membership" m2
  INNER JOIN "Subscription" s ON s.id = m2."subscriptionId"
  WHERE m2.status IN ('DUE', 'EXPIRED')
    AND m2."periodEnd" < NOW()
    AND NOT EXISTS (
      SELECT 1
      FROM "Membership" other
      WHERE other."subscriptionId" = m2."subscriptionId"
        AND other."purchaserUserId" = m2."purchaserUserId"
        AND other.id <> m2.id
        AND other."periodStart" = date_trunc('month', m2."periodEnd" + interval '1 day')
    )
) AS calc
WHERE m.id = calc.id;
