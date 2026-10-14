-- Public marketplace contract: categories, settings, freelance trainers,
-- independent ratings, floor hire. Backfill keeps existing rows valid.

CREATE TYPE "MarketplaceCategory" AS ENUM ('DANCE', 'MUSIC', 'FITNESS', 'ART');
CREATE TYPE "ClassLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');
CREATE TYPE "ClassAudience" AS ENUM ('KIDS', 'ADULTS', 'BOTH');
CREATE TYPE "MarketplaceRatingTarget" AS ENUM ('STUDIO', 'TRAINER');
CREATE TYPE "MarketplaceRatingSource" AS ENUM ('TRIAL', 'CLASS', 'PRIVATE');

ALTER TYPE "BookingType" ADD VALUE 'FLOOR_HIRE';

ALTER TABLE "User"
  ADD COLUMN "publicSlug" TEXT,
  ADD COLUMN "trainerRatingAvg" DOUBLE PRECISION,
  ADD COLUMN "trainerRatingCount" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "User_publicSlug_key" ON "User"("publicSlug");

ALTER TABLE "Studio"
  ADD COLUMN "primaryCategory" "MarketplaceCategory" NOT NULL DEFAULT 'DANCE',
  ADD COLUMN "ratingAvg" DOUBLE PRECISION,
  ADD COLUMN "ratingCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "StudioSettings"
  ADD COLUMN "publicStudioListing" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "publicClasses" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "publicTrainers" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "publicRatings" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "bookingTrial" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "bookingEnrollment" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "bookingPrivate" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "bookingFloorHire" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Batch"
  ADD COLUMN "slug" TEXT,
  ADD COLUMN "marketplaceCategory" "MarketplaceCategory" NOT NULL DEFAULT 'DANCE',
  ADD COLUMN "classLevel" "ClassLevel",
  ADD COLUMN "classAudience" "ClassAudience" NOT NULL DEFAULT 'ADULTS';

UPDATE "Batch"
SET "classAudience" = CASE
  WHEN "category" = 'KIDS' THEN 'KIDS'::"ClassAudience"
  ELSE 'ADULTS'::"ClassAudience"
END;

UPDATE "Batch"
SET "slug" = lower(trim(both '-' from regexp_replace("name", '[^a-zA-Z0-9]+', '-', 'g')))
  || '-' || left("id", 8)
WHERE "slug" IS NULL;

CREATE UNIQUE INDEX "Batch_slug_key" ON "Batch"("slug");
CREATE INDEX "Batch_marketplaceCategory_active_idx" ON "Batch"("marketplaceCategory", "active");

ALTER TABLE "Booking" ADD COLUMN "branchId" TEXT;
CREATE INDEX "Booking_branchId_idx" ON "Booking"("branchId");

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "StudioBranch"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "StudioMarketplaceCategory" (
  "studioId" TEXT NOT NULL,
  "category" "MarketplaceCategory" NOT NULL,
  CONSTRAINT "StudioMarketplaceCategory_pkey" PRIMARY KEY ("studioId", "category"),
  CONSTRAINT "StudioMarketplaceCategory_studioId_fkey"
    FOREIGN KEY ("studioId") REFERENCES "Studio"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "StudioMarketplaceCategory_category_idx" ON "StudioMarketplaceCategory"("category");

INSERT INTO "StudioMarketplaceCategory" ("studioId", "category")
SELECT "id", "primaryCategory" FROM "Studio"
ON CONFLICT DO NOTHING;

CREATE TABLE "TrainerStudio" (
  "trainerId" TEXT NOT NULL,
  "studioId" TEXT NOT NULL,
  "isHome" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainerStudio_pkey" PRIMARY KEY ("trainerId", "studioId"),
  CONSTRAINT "TrainerStudio_trainerId_fkey"
    FOREIGN KEY ("trainerId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TrainerStudio_studioId_fkey"
    FOREIGN KEY ("studioId") REFERENCES "Studio"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "TrainerStudio_studioId_idx" ON "TrainerStudio"("studioId");

INSERT INTO "TrainerStudio" ("trainerId", "studioId", "isHome", "createdAt", "updatedAt")
SELECT "id", "studioId", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User"
WHERE "role" = 'TRAINER' AND "studioId" IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE TABLE "TrainerMarketplaceCategory" (
  "trainerId" TEXT NOT NULL,
  "category" "MarketplaceCategory" NOT NULL,
  CONSTRAINT "TrainerMarketplaceCategory_pkey" PRIMARY KEY ("trainerId", "category"),
  CONSTRAINT "TrainerMarketplaceCategory_trainerId_fkey"
    FOREIGN KEY ("trainerId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "TrainerMarketplaceCategory_category_idx" ON "TrainerMarketplaceCategory"("category");

INSERT INTO "TrainerMarketplaceCategory" ("trainerId", "category")
SELECT "id", 'DANCE'::"MarketplaceCategory"
FROM "User"
WHERE "role" = 'TRAINER'
ON CONFLICT DO NOTHING;

CREATE TABLE "MarketplaceRating" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "target" "MarketplaceRatingTarget" NOT NULL,
  "studioId" TEXT,
  "trainerId" TEXT,
  "category" "MarketplaceCategory" NOT NULL,
  "rating" INTEGER NOT NULL,
  "source" "MarketplaceRatingSource" NOT NULL,
  "attendedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketplaceRating_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MarketplaceRating_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MarketplaceRating_studioId_fkey"
    FOREIGN KEY ("studioId") REFERENCES "Studio"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MarketplaceRating_trainerId_fkey"
    FOREIGN KEY ("trainerId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "MarketplaceRating_studioId_category_idx" ON "MarketplaceRating"("studioId", "category");
CREATE INDEX "MarketplaceRating_trainerId_category_idx" ON "MarketplaceRating"("trainerId", "category");
CREATE INDEX "MarketplaceRating_studentId_target_idx" ON "MarketplaceRating"("studentId", "target");

CREATE UNIQUE INDEX "MarketplaceRating_student_studio_category_key"
  ON "MarketplaceRating" ("studentId", "studioId", "category")
  WHERE "target" = 'STUDIO' AND "studioId" IS NOT NULL;

CREATE UNIQUE INDEX "MarketplaceRating_student_trainer_category_key"
  ON "MarketplaceRating" ("studentId", "trainerId", "category")
  WHERE "target" = 'TRAINER' AND "trainerId" IS NOT NULL;
