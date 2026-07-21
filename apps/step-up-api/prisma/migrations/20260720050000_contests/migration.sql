-- CreateEnum
CREATE TYPE "ContestStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ContestEntryType" AS ENUM ('INDIVIDUAL', 'GROUP');

-- CreateEnum
CREATE TYPE "ContestEntryStatus" AS ENUM ('PENDING', 'CONFIRMED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "Contest" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "branchId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "registrationOpensAt" TIMESTAMP(3),
    "registrationClosesAt" TIMESTAMP(3),
    "status" "ContestStatus" NOT NULL DEFAULT 'DRAFT',
    "creatorId" TEXT NOT NULL,
    "certificationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "certificateTemplateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestCategory" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "danceStyle" TEXT NOT NULL,
    "ageMin" INTEGER NOT NULL,
    "ageMax" INTEGER NOT NULL,
    "entryType" "ContestEntryType" NOT NULL,
    "maxEntries" INTEGER,
    "maxGroupSize" INTEGER,
    "certificateTemplateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContestCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestJudge" (
    "categoryId" TEXT NOT NULL,
    "judgeId" TEXT NOT NULL,

    CONSTRAINT "ContestJudge_pkey" PRIMARY KEY ("categoryId","judgeId")
);

-- CreateTable
CREATE TABLE "ContestEntry" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "teamName" TEXT,
    "status" "ContestEntryStatus" NOT NULL DEFAULT 'CONFIRMED',
    "registeredById" TEXT NOT NULL,
    "placement" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContestEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestEntryMember" (
    "entryId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "ContestEntryMember_pkey" PRIMARY KEY ("entryId","studentId")
);

-- CreateTable
CREATE TABLE "ContestCertificate" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedById" TEXT NOT NULL,
    "layoutSnapshot" JSONB NOT NULL,

    CONSTRAINT "ContestCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Contest_studioId_status_idx" ON "Contest"("studioId", "status");

-- CreateIndex
CREATE INDEX "Contest_studioId_startsAt_idx" ON "Contest"("studioId", "startsAt");

-- CreateIndex
CREATE INDEX "ContestCategory_contestId_idx" ON "ContestCategory"("contestId");

-- CreateIndex
CREATE INDEX "ContestEntry_categoryId_status_idx" ON "ContestEntry"("categoryId", "status");

-- CreateIndex
CREATE INDEX "ContestEntryMember_studentId_idx" ON "ContestEntryMember"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ContestCertificate_entryId_key" ON "ContestCertificate"("entryId");

-- AddForeignKey
ALTER TABLE "Contest" ADD CONSTRAINT "Contest_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contest" ADD CONSTRAINT "Contest_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "StudioBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contest" ADD CONSTRAINT "Contest_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contest" ADD CONSTRAINT "Contest_certificateTemplateId_fkey" FOREIGN KEY ("certificateTemplateId") REFERENCES "CertificateTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestCategory" ADD CONSTRAINT "ContestCategory_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestCategory" ADD CONSTRAINT "ContestCategory_certificateTemplateId_fkey" FOREIGN KEY ("certificateTemplateId") REFERENCES "CertificateTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestJudge" ADD CONSTRAINT "ContestJudge_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ContestCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestJudge" ADD CONSTRAINT "ContestJudge_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestEntry" ADD CONSTRAINT "ContestEntry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ContestCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestEntry" ADD CONSTRAINT "ContestEntry_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestEntryMember" ADD CONSTRAINT "ContestEntryMember_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "ContestEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestEntryMember" ADD CONSTRAINT "ContestEntryMember_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestCertificate" ADD CONSTRAINT "ContestCertificate_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "ContestEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestCertificate" ADD CONSTRAINT "ContestCertificate_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CertificateTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestCertificate" ADD CONSTRAINT "ContestCertificate_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
