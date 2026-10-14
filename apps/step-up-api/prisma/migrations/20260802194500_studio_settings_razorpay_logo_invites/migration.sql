-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- AlterTable
ALTER TABLE "Studio" ADD COLUMN "logoUrl" TEXT;

-- AlterTable
ALTER TABLE "StudioSettings" ADD COLUMN "razorpayKeyId" TEXT;
ALTER TABLE "StudioSettings" ADD COLUMN "razorpayKeySecret" TEXT;
ALTER TABLE "StudioSettings" ADD COLUMN "razorpaySecretIv" TEXT;

-- CreateTable
CREATE TABLE "StaffInvite" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffInvite_token_key" ON "StaffInvite"("token");

-- CreateIndex
CREATE INDEX "StaffInvite_studioId_status_idx" ON "StaffInvite"("studioId", "status");

-- CreateIndex
CREATE INDEX "StaffInvite_token_status_idx" ON "StaffInvite"("token", "status");

-- CreateIndex
CREATE INDEX "StaffInvite_email_studioId_idx" ON "StaffInvite"("email", "studioId");

-- AddForeignKey
ALTER TABLE "StaffInvite" ADD CONSTRAINT "StaffInvite_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffInvite" ADD CONSTRAINT "StaffInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
