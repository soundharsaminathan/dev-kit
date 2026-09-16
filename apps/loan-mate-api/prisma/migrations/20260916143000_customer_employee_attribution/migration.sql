-- AlterTable Customer: lead attribution + collection assignment
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "collectionOfficerId" TEXT;

CREATE INDEX IF NOT EXISTS "Customer_createdById_idx" ON "Customer"("createdById");
CREATE INDEX IF NOT EXISTS "Customer_collectionOfficerId_idx" ON "Customer"("collectionOfficerId");

ALTER TABLE "Customer" DROP CONSTRAINT IF EXISTS "Customer_createdById_fkey";
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Customer" DROP CONSTRAINT IF EXISTS "Customer_collectionOfficerId_fkey";
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_collectionOfficerId_fkey" FOREIGN KEY ("collectionOfficerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
