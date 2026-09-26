-- LMS gap: customer file, loan security, cheque, accounting drafts, document review

CREATE TYPE "InterestMethod" AS ENUM ('FLAT', 'REDUCING', 'REDUCING_DAILY');
CREATE TYPE "JournalStatus" AS ENUM ('DRAFT', 'POSTED');
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');
CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

ALTER TYPE "PaymentMode" ADD VALUE IF NOT EXISTS 'CHEQUE';
ALTER TYPE "ApprovalType" ADD VALUE IF NOT EXISTS 'FEE_WAIVER';
ALTER TYPE "ApprovalType" ADD VALUE IF NOT EXISTS 'LOAN_NPA_MARK';
ALTER TYPE "ApprovalType" ADD VALUE IF NOT EXISTS 'LOAN_NPA_CLEAR';

ALTER TABLE "CompanySettings" ADD COLUMN "approvalLevels" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "User" ADD COLUMN "phone" TEXT;

ALTER TABLE "Branch" ADD COLUMN "address" TEXT;
ALTER TABLE "Branch" ADD COLUMN "city" TEXT;
ALTER TABLE "Branch" ADD COLUMN "state" TEXT;
ALTER TABLE "Branch" ADD COLUMN "phone" TEXT;
ALTER TABLE "Branch" ADD COLUMN "email" TEXT;
ALTER TABLE "Branch" ADD COLUMN "isHeadOffice" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Customer" ADD COLUMN "firstName" TEXT;
ALTER TABLE "Customer" ADD COLUMN "middleName" TEXT;
ALTER TABLE "Customer" ADD COLUMN "lastName" TEXT;
ALTER TABLE "Customer" ADD COLUMN "gender" TEXT;
ALTER TABLE "Customer" ADD COLUMN "dateOfBirth" DATE;
ALTER TABLE "Customer" ADD COLUMN "fatherName" TEXT;
ALTER TABLE "Customer" ADD COLUMN "motherName" TEXT;
ALTER TABLE "Customer" ADD COLUMN "spouseName" TEXT;
ALTER TABLE "Customer" ADD COLUMN "maritalStatus" TEXT;
ALTER TABLE "Customer" ADD COLUMN "alternateMobile" TEXT;
ALTER TABLE "Customer" ADD COLUMN "email" TEXT;
ALTER TABLE "Customer" ADD COLUMN "whatsapp" TEXT;
ALTER TABLE "Customer" ADD COLUMN "aadhaar" TEXT;
ALTER TABLE "Customer" ADD COLUMN "voterId" TEXT;
ALTER TABLE "Customer" ADD COLUMN "drivingLicence" TEXT;
ALTER TABLE "Customer" ADD COLUMN "passportNo" TEXT;
ALTER TABLE "Customer" ADD COLUMN "creditScore" INTEGER;
ALTER TABLE "Customer" ADD COLUMN "riskCategory" TEXT;
ALTER TABLE "Customer" ADD COLUMN "notes" TEXT;

ALTER TABLE "Loan" ADD COLUMN "purpose" TEXT;
ALTER TABLE "Loan" ADD COLUMN "loanType" TEXT;
ALTER TABLE "Loan" ADD COLUMN "interestMethod" "InterestMethod" NOT NULL DEFAULT 'REDUCING_DAILY';
ALTER TABLE "Loan" ADD COLUMN "appliedAmount" DECIMAL(14,2);
ALTER TABLE "Loan" ADD COLUMN "approvedAmount" DECIMAL(14,2);
ALTER TABLE "Loan" ADD COLUMN "disbursedAmount" DECIMAL(14,2);
ALTER TABLE "Loan" ADD COLUMN "processingFeeGst" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "Loan" ADD COLUMN "insuranceAmount" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "Loan" ADD COLUMN "otherCharges" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "Loan" ADD COLUMN "chargesOutstanding" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "Loan" ADD COLUMN "moratoriumInstallments" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Loan" ADD COLUMN "graceInstallments" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Loan" ADD COLUMN "prepaymentAllowed" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Loan" ADD COLUMN "loanOfficerId" TEXT;
ALTER TABLE "Loan" ADD COLUMN "renewedFromLoanId" TEXT;
ALTER TABLE "Loan" ADD COLUMN "npa" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Loan" ADD COLUMN "npaDate" DATE;
ALTER TABLE "Loan" ADD COLUMN "npaCategory" TEXT;

ALTER TABLE "Payment" ADD COLUMN "bankName" TEXT;
ALTER TABLE "Payment" ADD COLUMN "chequeDate" DATE;

ALTER TABLE "ApprovalRequest" ADD COLUMN "level" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Document" ADD COLUMN "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING_REVIEW';
ALTER TABLE "Document" ADD COLUMN "reviewedById" TEXT;
ALTER TABLE "Document" ADD COLUMN "reviewedAt" TIMESTAMP(3);
ALTER TABLE "Document" ADD COLUMN "rejectionReason" TEXT;

ALTER TABLE "JournalEntry" ADD COLUMN "status" "JournalStatus" NOT NULL DEFAULT 'POSTED';

ALTER TABLE "Loan" ADD CONSTRAINT "Loan_loanOfficerId_fkey" FOREIGN KEY ("loanOfficerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_renewedFromLoanId_fkey" FOREIGN KEY ("renewedFromLoanId") REFERENCES "Loan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Loan_loanOfficerId_idx" ON "Loan"("loanOfficerId");

CREATE TABLE "CustomerAddress" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerAddress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerEmployment" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "employerName" TEXT NOT NULL,
    "designation" TEXT,
    "monthlyIncome" DECIMAL(14,2) NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerEmployment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerBankAccount" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "ifsc" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerBankAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerNominee" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "mobile" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerNominee_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerReference" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT,
    "mobile" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerReference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerKyc" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "issuingAuthority" TEXT,
    "issueDate" DATE,
    "expiryDate" DATE,
    "status" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerKyc_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LoanCollateral" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "collateralType" TEXT NOT NULL,
    "description" TEXT,
    "ownerName" TEXT,
    "estimatedValue" DECIMAL(14,2) NOT NULL,
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoanCollateral_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LoanGuarantor" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT,
    "mobile" TEXT NOT NULL,
    "pan" TEXT,
    "monthlyIncome" DECIMAL(14,2),
    "hasSigned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoanGuarantor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LoanVerification" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "verifiedById" TEXT NOT NULL,
    "verificationType" TEXT NOT NULL DEFAULT 'FIELD',
    "remarks" TEXT,
    "checklist" JSONB,
    "gps" TEXT,
    "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoanVerification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DisbursementTranche" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "mode" "PaymentMode" NOT NULL,
    "reference" TEXT,
    "paidAt" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DisbursementTranche_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReceiptReprint" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "reprintedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReceiptReprint_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentVersion" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "objectKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentVersion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomerAddress_customerId_idx" ON "CustomerAddress"("customerId");
CREATE INDEX "CustomerEmployment_customerId_idx" ON "CustomerEmployment"("customerId");
CREATE INDEX "CustomerBankAccount_customerId_idx" ON "CustomerBankAccount"("customerId");
CREATE INDEX "CustomerNominee_customerId_idx" ON "CustomerNominee"("customerId");
CREATE INDEX "CustomerReference_customerId_idx" ON "CustomerReference"("customerId");
CREATE INDEX "CustomerKyc_customerId_idx" ON "CustomerKyc"("customerId");
CREATE INDEX "LoanCollateral_loanId_idx" ON "LoanCollateral"("loanId");
CREATE INDEX "LoanGuarantor_loanId_idx" ON "LoanGuarantor"("loanId");
CREATE INDEX "LoanVerification_loanId_idx" ON "LoanVerification"("loanId");
CREATE UNIQUE INDEX "DisbursementTranche_loanId_number_key" ON "DisbursementTranche"("loanId", "number");
CREATE INDEX "DisbursementTranche_loanId_idx" ON "DisbursementTranche"("loanId");
CREATE INDEX "ReceiptReprint_paymentId_idx" ON "ReceiptReprint"("paymentId");
CREATE UNIQUE INDEX "DocumentVersion_documentId_versionNumber_key" ON "DocumentVersion"("documentId", "versionNumber");
CREATE INDEX "DocumentVersion_documentId_idx" ON "DocumentVersion"("documentId");

ALTER TABLE "CustomerAddress" ADD CONSTRAINT "CustomerAddress_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerEmployment" ADD CONSTRAINT "CustomerEmployment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerBankAccount" ADD CONSTRAINT "CustomerBankAccount_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerNominee" ADD CONSTRAINT "CustomerNominee_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerReference" ADD CONSTRAINT "CustomerReference_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerKyc" ADD CONSTRAINT "CustomerKyc_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoanCollateral" ADD CONSTRAINT "LoanCollateral_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoanGuarantor" ADD CONSTRAINT "LoanGuarantor_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoanVerification" ADD CONSTRAINT "LoanVerification_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DisbursementTranche" ADD CONSTRAINT "DisbursementTranche_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReceiptReprint" ADD CONSTRAINT "ReceiptReprint_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
