-- CreateEnum
CREATE TYPE "FamilyMemberKind" AS ENUM ('KID', 'CO_STUDENT');

-- CreateTable
CREATE TABLE "FamilyMember" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "memberUserId" TEXT NOT NULL,
    "kind" "FamilyMemberKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FamilyMember_ownerUserId_idx" ON "FamilyMember"("ownerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyMember_ownerUserId_memberUserId_key" ON "FamilyMember"("ownerUserId", "memberUserId");

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_memberUserId_fkey" FOREIGN KEY ("memberUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
