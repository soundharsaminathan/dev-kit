-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'RAZORPAY';

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "razorpayOrderId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "razorpayPaymentId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "paymentHoldExpiresAt" TIMESTAMP(3);
ALTER TABLE "Invoice" ADD COLUMN "purchaseMeta" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_razorpayOrderId_key" ON "Invoice"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_razorpayPaymentId_key" ON "Invoice"("razorpayPaymentId");

-- CreateIndex
CREATE INDEX "Invoice_status_paymentHoldExpiresAt_idx" ON "Invoice"("status", "paymentHoldExpiresAt");
