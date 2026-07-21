-- CreateTable
CREATE TABLE "StudioBranch" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudioBranch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudioBranch_studioId_idx" ON "StudioBranch"("studioId");

-- AddForeignKey
ALTER TABLE "StudioBranch"
ADD CONSTRAINT "StudioBranch_studioId_fkey"
FOREIGN KEY ("studioId") REFERENCES "Studio"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Batch" ADD COLUMN "branchId" TEXT;

-- Backfill one branch per distinct studio/location, then link batches
INSERT INTO "StudioBranch" ("id", "studioId", "name", "address", "photos", "createdAt", "updatedAt")
SELECT
  'branch-' || md5("studioId" || ':' || "location"),
  "studioId",
  CASE
    WHEN trim("location") = '' THEN 'Main location'
    ELSE left(trim("location"), 80)
  END,
  CASE
    WHEN trim("location") = '' THEN 'Address pending'
    ELSE trim("location")
  END,
  ARRAY[]::TEXT[],
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "studioId", "location"
  FROM "Batch"
) AS distinct_locations;

UPDATE "Batch" AS batch
SET "branchId" = 'branch-' || md5(batch."studioId" || ':' || batch."location");

-- Seed studios without batches still need no branch; leave nullable only briefly
ALTER TABLE "Batch" ALTER COLUMN "branchId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Batch"
ADD CONSTRAINT "Batch_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "StudioBranch"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Batch" DROP COLUMN "location";
