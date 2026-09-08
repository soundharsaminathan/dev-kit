-- AlterTable
ALTER TABLE "StudioSettings" ADD COLUMN "razorpayWebhookSecret" TEXT;
ALTER TABLE "StudioSettings" ADD COLUMN "razorpayWebhookSecretIv" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "razorpayPaymentLinkId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "razorpayPaymentLinkUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_razorpayPaymentLinkId_key" ON "Invoice"("razorpayPaymentLinkId");

-- CreateTable
CREATE TABLE "WhatsappMessage" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "providerId" TEXT,
    "errorCode" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappMessage_invoiceId_key" ON "WhatsappMessage"("invoiceId");

-- CreateIndex
CREATE INDEX "WhatsappMessage_studioId_createdAt_idx" ON "WhatsappMessage"("studioId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "WhatsappMessage_status_updatedAt_idx" ON "WhatsappMessage"("status", "updatedAt");

-- AddForeignKey
ALTER TABLE "WhatsappMessage" ADD CONSTRAINT "WhatsappMessage_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
