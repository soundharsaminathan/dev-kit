-- AlterTable
ALTER TABLE "OutboxEvent" ADD COLUMN "claimedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "OutboxEvent_claimedAt_idx" ON "OutboxEvent"("claimedAt");

-- CreateIndex
CREATE INDEX "Batch_studioId_active_idx" ON "Batch"("studioId", "active");

-- CreateIndex
CREATE INDEX "Subscription_studioId_active_idx" ON "Subscription"("studioId", "active");

-- CreateIndex
CREATE INDEX "Invoice_studioId_id_idx" ON "Invoice"("studioId", "id");

-- CreateIndex
CREATE INDEX "Invoice_studentId_idx" ON "Invoice"("studentId");

-- CreateIndex
CREATE INDEX "Session_batchId_startsAt_idx" ON "Session"("batchId", "startsAt");

-- CreateIndex
CREATE INDEX "Booking_studentId_status_idx" ON "Booking"("studentId", "status");

-- CreateIndex
CREATE INDEX "Booking_trainerId_status_idx" ON "Booking"("trainerId", "status");

-- CreateIndex
CREATE INDEX "Booking_studioId_status_idx" ON "Booking"("studioId", "status");

-- CreateTable
CREATE TABLE "BatchSummary" (
    "batchId" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "enrolled" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "availableSeats" INTEGER NOT NULL DEFAULT 0,
    "trainerCount" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BatchSummary_pkey" PRIMARY KEY ("batchId")
);

-- CreateTable
CREATE TABLE "StudioRevenueSummary" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "grossRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "refunds" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paidInvoices" INTEGER NOT NULL DEFAULT 0,
    "pendingInvoices" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioRevenueSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BatchSummary_studioId_active_idx" ON "BatchSummary"("studioId", "active");

-- CreateIndex
CREATE INDEX "StudioRevenueSummary_studioId_period_idx" ON "StudioRevenueSummary"("studioId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "StudioRevenueSummary_studioId_period_key" ON "StudioRevenueSummary"("studioId", "period");

-- AddForeignKey
ALTER TABLE "BatchSummary" ADD CONSTRAINT "BatchSummary_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchSummary" ADD CONSTRAINT "BatchSummary_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioRevenueSummary" ADD CONSTRAINT "StudioRevenueSummary_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill operational BatchSummary from current enrollments / trainers
INSERT INTO "BatchSummary" (
  "batchId",
  "studioId",
  "capacity",
  "enrolled",
  "reserved",
  "availableSeats",
  "trainerCount",
  "active",
  "updatedAt"
)
SELECT
  b.id,
  b."studioId",
  b.capacity,
  COALESCE((
    SELECT COUNT(*)::int
    FROM "BatchEnrollment" e
    WHERE e."batchId" = b.id AND e.status = 'ACTIVE'
  ), 0),
  0,
  GREATEST(
    0,
    b.capacity - COALESCE((
      SELECT COUNT(*)::int
      FROM "BatchEnrollment" e
      WHERE e."batchId" = b.id AND e.status = 'ACTIVE'
    ), 0)
  ),
  COALESCE((
    SELECT COUNT(*)::int
    FROM "BatchTrainer" t
    WHERE t."batchId" = b.id
  ), 0),
  b.active,
  NOW()
FROM "Batch" b
ON CONFLICT ("batchId") DO NOTHING;
