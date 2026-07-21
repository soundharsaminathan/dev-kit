-- CreateEnum
CREATE TYPE "BranchMediaKind" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "BranchMediaCategory" AS ENUM ('STUDIO', 'RECEPTION', 'PRACTICE_HALL', 'EVENTS', 'FACILITIES', 'OTHER');

-- AlterTable
ALTER TABLE "StudioBranch"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "coverMediaId" TEXT,
  ADD COLUMN "amenities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "openingHours" JSONB,
  ADD COLUMN "pricingBlurb" TEXT;

-- CreateTable
CREATE TABLE "BranchMedia" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "kind" "BranchMediaKind" NOT NULL,
    "category" "BranchMediaCategory" NOT NULL DEFAULT 'STUDIO',
    "objectKey" TEXT NOT NULL,
    "caption" TEXT,
    "altText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BranchMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BranchFaq" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BranchFaq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BranchTestimonial" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "rating" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BranchTestimonial_pkey" PRIMARY KEY ("id")
);

-- Backfill photos into BranchMedia
INSERT INTO "BranchMedia" ("id", "branchId", "kind", "category", "objectKey", "sortOrder", "createdAt", "updatedAt")
SELECT
  'bm_' || b."id" || '_' || ordinality::text,
  b."id",
  'IMAGE'::"BranchMediaKind",
  'STUDIO'::"BranchMediaCategory",
  photo,
  (ordinality - 1)::integer,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "StudioBranch" b
CROSS JOIN LATERAL unnest(b."photos") WITH ORDINALITY AS photo(photo, ordinality)
WHERE photo IS NOT NULL AND photo <> '';

-- Set cover to first photo media
UPDATE "StudioBranch" b
SET "coverMediaId" = m."id"
FROM "BranchMedia" m
WHERE m."branchId" = b."id"
  AND m."sortOrder" = 0
  AND b."coverMediaId" IS NULL;

-- Drop photos column
ALTER TABLE "StudioBranch" DROP COLUMN "photos";

-- CreateIndex
CREATE UNIQUE INDEX "StudioBranch_coverMediaId_key" ON "StudioBranch"("coverMediaId");

-- CreateIndex
CREATE INDEX "BranchMedia_branchId_sortOrder_idx" ON "BranchMedia"("branchId", "sortOrder");

-- CreateIndex
CREATE INDEX "BranchMedia_branchId_archivedAt_idx" ON "BranchMedia"("branchId", "archivedAt");

-- CreateIndex
CREATE INDEX "BranchFaq_branchId_sortOrder_idx" ON "BranchFaq"("branchId", "sortOrder");

-- CreateIndex
CREATE INDEX "BranchTestimonial_branchId_sortOrder_idx" ON "BranchTestimonial"("branchId", "sortOrder");

-- AddForeignKey
ALTER TABLE "BranchMedia" ADD CONSTRAINT "BranchMedia_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "StudioBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioBranch" ADD CONSTRAINT "StudioBranch_coverMediaId_fkey" FOREIGN KEY ("coverMediaId") REFERENCES "BranchMedia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchFaq" ADD CONSTRAINT "BranchFaq_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "StudioBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchTestimonial" ADD CONSTRAINT "BranchTestimonial_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "StudioBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
