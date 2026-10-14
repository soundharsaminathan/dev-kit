-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'AWAITING_PAYMENT';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "paymentHoldExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Booking_status_paymentHoldExpiresAt_idx" ON "Booking"("status", "paymentHoldExpiresAt");
