-- CreateEnum
CREATE TYPE "ExpensePaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'UPI', 'CARD', 'CHEQUE', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseRecurrenceFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "branchId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "categoryId" TEXT NOT NULL,
    "vendor" TEXT,
    "paymentMethod" "ExpensePaymentMethod",
    "description" TEXT,
    "notes" TEXT,
    "receiptKey" TEXT,
    "recurringExpenseId" TEXT,
    "createdById" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringExpense" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "frequency" "ExpenseRecurrenceFrequency" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "nextOccurrence" TIMESTAMP(3) NOT NULL,
    "vendor" TEXT,
    "paymentMethod" "ExpensePaymentMethod",
    "description" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringExpense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExpenseCategory_studioId_archivedAt_idx" ON "ExpenseCategory"("studioId", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_studioId_name_key" ON "ExpenseCategory"("studioId", "name");

-- CreateIndex
CREATE INDEX "Expense_studioId_expenseDate_idx" ON "Expense"("studioId", "expenseDate");

-- CreateIndex
CREATE INDEX "Expense_studioId_categoryId_idx" ON "Expense"("studioId", "categoryId");

-- CreateIndex
CREATE INDEX "Expense_studioId_vendor_idx" ON "Expense"("studioId", "vendor");

-- CreateIndex
CREATE INDEX "Expense_studioId_archivedAt_idx" ON "Expense"("studioId", "archivedAt");

-- CreateIndex
CREATE INDEX "RecurringExpense_studioId_active_idx" ON "RecurringExpense"("studioId", "active");

-- CreateIndex
CREATE INDEX "RecurringExpense_studioId_nextOccurrence_idx" ON "RecurringExpense"("studioId", "nextOccurrence");

-- AddForeignKey
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "StudioBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_recurringExpenseId_fkey" FOREIGN KEY ("recurringExpenseId") REFERENCES "RecurringExpense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringExpense" ADD CONSTRAINT "RecurringExpense_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringExpense" ADD CONSTRAINT "RecurringExpense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringExpense" ADD CONSTRAINT "RecurringExpense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
