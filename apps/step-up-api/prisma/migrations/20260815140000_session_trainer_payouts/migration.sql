-- AlterTable
ALTER TABLE "Session" ADD COLUMN "trainerId" TEXT;

-- AlterTable
ALTER TABLE "BatchTrainer" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Backfill BatchTrainer.sortOrder deterministically per batch (0,1,2...) so the
-- first trainer is stable for existing rows (ordered by trainerId when unknown).
UPDATE "BatchTrainer" AS bt
SET "sortOrder" = ranked.rn
FROM (
  SELECT "batchId", "trainerId",
         ROW_NUMBER() OVER (PARTITION BY "batchId" ORDER BY "trainerId") - 1 AS rn
  FROM "BatchTrainer"
) AS ranked
WHERE bt."batchId" = ranked."batchId" AND bt."trainerId" = ranked."trainerId";

-- Backfill completed sessions to the batch's first trainer (sortOrder 0).
UPDATE "Session" AS s
SET "trainerId" = (
  SELECT bt."trainerId"
  FROM "BatchTrainer" AS bt
  WHERE bt."batchId" = s."batchId"
  ORDER BY bt."sortOrder" ASC, bt."trainerId" ASC
  LIMIT 1
)
WHERE s."status" = 'COMPLETED' AND s."trainerId" IS NULL;

-- CreateEnum
CREATE TYPE "TrainerPayoutStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'CANCELLED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'TRAINER_PAYOUT';

-- CreateTable
CREATE TABLE "TrainerPayout" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "sessionCount" INTEGER NOT NULL,
    "amount" DECIMAL(10,2),
    "notes" TEXT,
    "status" "TrainerPayoutStatus" NOT NULL DEFAULT 'DRAFT',
    "sentAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainerPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainerPayoutSession" (
    "id" TEXT NOT NULL,
    "payoutId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,

    CONSTRAINT "TrainerPayoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrainerPayout_studioId_trainerId_periodStart_key" ON "TrainerPayout"("studioId", "trainerId", "periodStart");

-- CreateIndex
CREATE INDEX "TrainerPayout_studioId_status_periodStart_idx" ON "TrainerPayout"("studioId", "status", "periodStart");

-- CreateIndex
CREATE INDEX "TrainerPayout_trainerId_status_idx" ON "TrainerPayout"("trainerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TrainerPayoutSession_payoutId_sessionId_key" ON "TrainerPayoutSession"("payoutId", "sessionId");

-- CreateIndex
CREATE INDEX "TrainerPayoutSession_sessionId_idx" ON "TrainerPayoutSession"("sessionId");

-- CreateIndex
CREATE INDEX "Session_status_trainerId_idx" ON "Session"("status", "trainerId");

-- CreateIndex
CREATE INDEX "BatchTrainer_batchId_sortOrder_idx" ON "BatchTrainer"("batchId", "sortOrder");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerPayout" ADD CONSTRAINT "TrainerPayout_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerPayout" ADD CONSTRAINT "TrainerPayout_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerPayoutSession" ADD CONSTRAINT "TrainerPayoutSession_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "TrainerPayout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerPayoutSession" ADD CONSTRAINT "TrainerPayoutSession_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;