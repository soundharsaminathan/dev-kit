-- Wipe legacy batch trial enrollments (pre-prod; session-scoped trials replace them).
DELETE FROM "BatchEnrollment" WHERE "isTrial" = true;

ALTER TABLE "BatchEnrollment" DROP COLUMN "isTrial";
ALTER TABLE "BatchEnrollment" DROP COLUMN "trialSessionIds";
