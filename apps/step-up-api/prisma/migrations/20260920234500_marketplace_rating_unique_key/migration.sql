-- One public rating per student × target × category (child, not parent login).
ALTER TABLE "MarketplaceRating" ADD COLUMN "uniqueKey" TEXT;

UPDATE "MarketplaceRating"
SET "uniqueKey" =
  "studentId" || ':' || "target" || ':' ||
  CASE
    WHEN "target" = 'STUDIO' THEN COALESCE("studioId", '')
    ELSE COALESCE("trainerId", '')
  END || ':' || "category"
WHERE "uniqueKey" IS NULL;

ALTER TABLE "MarketplaceRating" ALTER COLUMN "uniqueKey" SET NOT NULL;

CREATE UNIQUE INDEX "MarketplaceRating_uniqueKey_key" ON "MarketplaceRating"("uniqueKey");
