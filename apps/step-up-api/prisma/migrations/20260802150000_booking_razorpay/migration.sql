-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "razorpayOrderId" TEXT;
ALTER TABLE "Booking" ADD COLUMN "razorpayPaymentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Booking_razorpayOrderId_key" ON "Booking"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_razorpayPaymentId_key" ON "Booking"("razorpayPaymentId");
