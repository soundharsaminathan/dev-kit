-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('REGULAR', 'TRIAL');

-- AlterTable
ALTER TABLE "Session" ADD COLUMN "type" "SessionType" NOT NULL DEFAULT 'REGULAR';

-- CreateIndex
CREATE INDEX "Session_type_startsAt_idx" ON "Session"("type", "startsAt");
