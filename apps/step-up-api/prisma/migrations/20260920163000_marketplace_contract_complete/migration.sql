-- F1 remainder: private/floor prices, trainer calendar, booking notifications.

ALTER TABLE "StudioSettings"
  ADD COLUMN "privateSessionPaise" INTEGER,
  ADD COLUMN "privateSessionMinutes" INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN "floorHirePaise" INTEGER,
  ADD COLUMN "floorHireSlotMinutes" INTEGER NOT NULL DEFAULT 60;

ALTER TABLE "TrainerStudio"
  ADD COLUMN "privateSessionPaise" INTEGER,
  ADD COLUMN "privateSessionMinutes" INTEGER;

CREATE TABLE "TrainerAvailability" (
  "id" TEXT NOT NULL,
  "trainerId" TEXT NOT NULL,
  "weekday" INTEGER NOT NULL,
  "startsAt" TEXT NOT NULL,
  "endsAt" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainerAvailability_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TrainerAvailability_trainerId_fkey"
    FOREIGN KEY ("trainerId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "TrainerAvailability_trainerId_weekday_startsAt_endsAt_key"
  ON "TrainerAvailability" ("trainerId", "weekday", "startsAt", "endsAt");
CREATE INDEX "TrainerAvailability_trainerId_weekday_idx"
  ON "TrainerAvailability" ("trainerId", "weekday");

CREATE TABLE "TrainerBlock" (
  "id" TEXT NOT NULL,
  "trainerId" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainerBlock_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TrainerBlock_trainerId_fkey"
    FOREIGN KEY ("trainerId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "TrainerBlock_trainerId_startsAt_endsAt_idx"
  ON "TrainerBlock" ("trainerId", "startsAt", "endsAt");

ALTER TYPE "NotificationType" ADD VALUE 'BOOKING_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE 'BOOKING_CONFIRMED';
ALTER TYPE "NotificationType" ADD VALUE 'BOOKING_CANCELLED';
ALTER TYPE "NotificationType" ADD VALUE 'BOOKING_RESCHEDULE_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE 'BOOKING_RESCHEDULED';
ALTER TYPE "NotificationType" ADD VALUE 'BOOKING_REMINDER';
