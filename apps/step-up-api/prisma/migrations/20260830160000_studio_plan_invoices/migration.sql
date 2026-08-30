-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'STUDIO_PLAN_INVOICE';

-- CreateEnum
CREATE TYPE "StudioPlan" AS ENUM ('BASIC', 'ADVANCED');

-- CreateEnum
CREATE TYPE "StudioInvoiceStatus" AS ENUM ('DRAFT', 'PENDING', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "StudioInvoicePaymentMethod" AS ENUM ('CASH', 'UPI_MANUAL');

-- CreateTable
CREATE TABLE "StudioInvoice" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "billedUserId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "status" "StudioInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "plan" "StudioPlan" NOT NULL,
    "listAmount" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "usageSnapshot" JSONB NOT NULL,
    "notes" TEXT,
    "publishedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "paymentMethod" "StudioInvoicePaymentMethod",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudioInvoice_studioId_status_idx" ON "StudioInvoice"("studioId", "status");

-- CreateIndex
CREATE INDEX "StudioInvoice_studioId_periodStart_idx" ON "StudioInvoice"("studioId", "periodStart");

-- CreateIndex
CREATE INDEX "StudioInvoice_billedUserId_idx" ON "StudioInvoice"("billedUserId");

-- AddForeignKey
ALTER TABLE "StudioInvoice" ADD CONSTRAINT "StudioInvoice_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioInvoice" ADD CONSTRAINT "StudioInvoice_billedUserId_fkey" FOREIGN KEY ("billedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioInvoice" ADD CONSTRAINT "StudioInvoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
