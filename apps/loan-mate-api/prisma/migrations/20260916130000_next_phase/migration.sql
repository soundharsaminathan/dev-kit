-- AlterEnum
ALTER TYPE "LoanStatus" ADD VALUE IF NOT EXISTS 'WRITTEN_OFF';

-- AlterEnum
ALTER TYPE "InstallmentStatus" ADD VALUE IF NOT EXISTS 'SKIPPED';

-- AlterEnum ApprovalType: add new values
ALTER TYPE "ApprovalType" ADD VALUE IF NOT EXISTS 'PENALTY_OVERRIDE';
ALTER TYPE "ApprovalType" ADD VALUE IF NOT EXISTS 'INTEREST_WAIVER';
ALTER TYPE "ApprovalType" ADD VALUE IF NOT EXISTS 'NPA_MARK';
ALTER TYPE "ApprovalType" ADD VALUE IF NOT EXISTS 'NPA_CLEAR';
ALTER TYPE "ApprovalType" ADD VALUE IF NOT EXISTS 'FORECLOSURE';
ALTER TYPE "ApprovalType" ADD VALUE IF NOT EXISTS 'SETTLEMENT';
ALTER TYPE "ApprovalType" ADD VALUE IF NOT EXISTS 'WRITE_OFF';
ALTER TYPE "ApprovalType" ADD VALUE IF NOT EXISTS 'RESTRUCTURE';

-- CreateEnum
CREATE TYPE "ClosureType" AS ENUM ('NORMAL', 'FORECLOSED', 'SETTLED');

-- CreateEnum
CREATE TYPE "DocumentEntityType" AS ENUM ('CUSTOMER', 'LOAN', 'PAYMENT');

-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('KYC_PHOTO_ID', 'KYC_PAN', 'KYC_ADDRESS', 'LOAN_AGREEMENT', 'LOAN_SANCTION', 'PAYMENT_RECEIPT', 'OTHER');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'INCOME', 'EXPENSE', 'EQUITY');

-- CreateEnum
CREATE TYPE "JournalSourceType" AS ENUM ('DISBURSEMENT', 'PAYMENT', 'FEE', 'WAIVER', 'REVERSAL', 'FORECLOSURE', 'SETTLEMENT', 'WRITE_OFF', 'RESTRUCTURE', 'MANUAL');

-- AlterTable CompanySettings
ALTER TABLE "CompanySettings" ADD COLUMN IF NOT EXISTS "foreclosureChargePercent" DECIMAL(8,4) NOT NULL DEFAULT 0;
ALTER TABLE "CompanySettings" ADD COLUMN IF NOT EXISTS "maxRestructures" INTEGER NOT NULL DEFAULT 3;

-- AlterTable Customer
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "npa" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "npaReason" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "npaMarkedAt" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "npaClearedAt" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "npaSourceLoanId" TEXT;

-- AlterTable Loan
ALTER TABLE "Loan" ADD COLUMN IF NOT EXISTS "closureType" "ClosureType";
ALTER TABLE "Loan" ADD COLUMN IF NOT EXISTS "disbursementMode" "PaymentMode";
ALTER TABLE "Loan" ADD COLUMN IF NOT EXISTS "disbursementReference" TEXT;
ALTER TABLE "Loan" ADD COLUMN IF NOT EXISTS "restructureCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Loan" ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3);
ALTER TABLE "Loan" ADD COLUMN IF NOT EXISTS "writtenOffAt" TIMESTAMP(3);

-- AlterTable ApprovalRequest
ALTER TABLE "ApprovalRequest" ADD COLUMN IF NOT EXISTS "appliedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Customer_companyId_npa_idx" ON "Customer"("companyId", "npa");

-- CreateTable Document
CREATE TABLE IF NOT EXISTS "Document" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "entityType" "DocumentEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "kind" "DocumentKind" NOT NULL,
    "objectKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Document_companyId_entityType_entityId_idx" ON "Document"("companyId", "entityType", "entityId");

-- CreateTable LoanClosure
CREATE TABLE IF NOT EXISTS "LoanClosure" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "type" "ClosureType" NOT NULL,
    "asOfDate" DATE NOT NULL,
    "principalOutstanding" DECIMAL(14,2) NOT NULL,
    "interestAccrued" DECIMAL(14,2) NOT NULL,
    "penaltyOutstanding" DECIMAL(14,2) NOT NULL,
    "foreclosureCharge" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "settlementAmount" DECIMAL(14,2),
    "amountWrittenOff" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "amountCollected" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoanClosure_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LoanClosure_loanId_idx" ON "LoanClosure"("loanId");

-- CreateTable LoanRestructure
CREATE TABLE IF NOT EXISTS "LoanRestructure" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "oldTenure" INTEGER NOT NULL,
    "newTenure" INTEGER NOT NULL,
    "oldRate" DECIMAL(8,4) NOT NULL,
    "newRate" DECIMAL(8,4) NOT NULL,
    "oldEmiAmount" DECIMAL(14,2),
    "newEmiAmount" DECIMAL(14,2),
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoanRestructure_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LoanRestructure_loanId_idx" ON "LoanRestructure"("loanId");

-- CreateTable Account
CREATE TABLE IF NOT EXISTS "Account" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Account_companyId_code_key" ON "Account"("companyId", "code");
CREATE INDEX IF NOT EXISTS "Account_companyId_idx" ON "Account"("companyId");

-- CreateTable JournalEntry
CREATE TABLE IF NOT EXISTS "JournalEntry" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "entryDate" DATE NOT NULL,
    "memo" TEXT,
    "sourceType" "JournalSourceType" NOT NULL,
    "sourceId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "JournalEntry_companyId_entryDate_idx" ON "JournalEntry"("companyId", "entryDate");
CREATE INDEX IF NOT EXISTS "JournalEntry_sourceType_sourceId_idx" ON "JournalEntry"("sourceType", "sourceId");

-- CreateTable JournalLine
CREATE TABLE IF NOT EXISTS "JournalLine" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "debit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    CONSTRAINT "JournalLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "JournalLine_journalId_idx" ON "JournalLine"("journalId");
CREATE INDEX IF NOT EXISTS "JournalLine_accountId_idx" ON "JournalLine"("accountId");

-- CreateTable Notification
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "readAt" TIMESTAMP(3),
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");
CREATE INDEX IF NOT EXISTS "Notification_companyId_createdAt_idx" ON "Notification"("companyId", "createdAt");

-- Foreign keys (ignore if already exist via DO blocks)
DO $$ BEGIN
  ALTER TABLE "Document" ADD CONSTRAINT "Document_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "LoanClosure" ADD CONSTRAINT "LoanClosure_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "LoanRestructure" ADD CONSTRAINT "LoanRestructure_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Account" ADD CONSTRAINT "Account_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "JournalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Notification" ADD CONSTRAINT "Notification_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
