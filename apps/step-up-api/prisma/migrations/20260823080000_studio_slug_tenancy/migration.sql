-- CreateEnum
CREATE TYPE "StudioStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- AlterTable Studio: add slug/status/timestamps (nullable first for backfill)
ALTER TABLE "Studio" ADD COLUMN "slug" TEXT;
ALTER TABLE "Studio" ADD COLUMN "status" "StudioStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Studio" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Studio" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill slugs from name (sanitize + uniquify)
WITH base AS (
  SELECT
    id,
    LOWER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(name), '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')) AS raw_slug
  FROM "Studio"
),
normalized AS (
  SELECT
    id,
    CASE
      WHEN raw_slug IS NULL OR raw_slug = '' THEN 'studio'
      ELSE raw_slug
    END AS slug_base
  FROM base
),
ranked AS (
  SELECT
    id,
    slug_base,
    ROW_NUMBER() OVER (PARTITION BY slug_base ORDER BY id) AS rn
  FROM normalized
)
UPDATE "Studio" AS s
SET slug = CASE
  WHEN r.rn = 1 THEN r.slug_base
  ELSE r.slug_base || '-' || r.rn::text
END
FROM ranked r
WHERE s.id = r.id;

ALTER TABLE "Studio" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Studio_slug_key" ON "Studio"("slug");

-- Deduplicate branch names per studio before unique constraint
WITH dup_branches AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY "studioId", name ORDER BY id) AS rn
  FROM "StudioBranch"
)
UPDATE "StudioBranch" AS b
SET name = b.name || ' (' || d.rn::text || ')'
FROM dup_branches d
WHERE b.id = d.id AND d.rn > 1;

CREATE UNIQUE INDEX "StudioBranch_studioId_name_key" ON "StudioBranch"("studioId", "name");

-- Deduplicate certificate template names
WITH dup_templates AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY "studioId", name ORDER BY id) AS rn
  FROM "CertificateTemplate"
)
UPDATE "CertificateTemplate" AS t
SET name = t.name || ' (' || d.rn::text || ')'
FROM dup_templates d
WHERE t.id = d.id AND d.rn > 1;

CREATE UNIQUE INDEX "CertificateTemplate_studioId_name_key" ON "CertificateTemplate"("studioId", "name");

-- Deduplicate batch names per studio+branch
WITH dup_batches AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY "studioId", "branchId", name ORDER BY id) AS rn
  FROM "Batch"
)
UPDATE "Batch" AS b
SET name = b.name || ' (' || d.rn::text || ')'
FROM dup_batches d
WHERE b.id = d.id AND d.rn > 1;

CREATE UNIQUE INDEX "Batch_studioId_branchId_name_key" ON "Batch"("studioId", "branchId", "name");

-- Deduplicate subscription names
WITH dup_subs AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY "studioId", name ORDER BY id) AS rn
  FROM "Subscription"
)
UPDATE "Subscription" AS s
SET name = s.name || ' (' || d.rn::text || ')'
FROM dup_subs d
WHERE s.id = d.id AND d.rn > 1;

CREATE UNIQUE INDEX "Subscription_studioId_name_key" ON "Subscription"("studioId", "name");

-- Notification.studioId
ALTER TABLE "Notification" ADD COLUMN "studioId" TEXT;
CREATE INDEX "Notification_studioId_createdAt_idx" ON "Notification"("studioId", "createdAt" DESC);
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- OutboxEvent.studioId
ALTER TABLE "OutboxEvent" ADD COLUMN "studioId" TEXT;
CREATE INDEX "OutboxEvent_studioId_publishedAt_idx" ON "OutboxEvent"("studioId", "publishedAt");
ALTER TABLE "OutboxEvent" ADD CONSTRAINT "OutboxEvent_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
