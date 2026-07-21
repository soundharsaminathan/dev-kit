-- AlterTable
ALTER TABLE "Batch" ADD COLUMN IF NOT EXISTS "coverImageUrl" TEXT;
ALTER TABLE "Batch" ADD COLUMN IF NOT EXISTS "ratingAvg" DOUBLE PRECISION;
ALTER TABLE "Batch" ADD COLUMN IF NOT EXISTS "ratingCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "batchId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Booking_batchId_idx" ON "Booking"("batchId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Booking_batchId_fkey'
  ) THEN
    ALTER TABLE "Booking"
      ADD CONSTRAINT "Booking_batchId_fkey"
      FOREIGN KEY ("batchId") REFERENCES "Batch"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
