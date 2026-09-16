import { CHART_OF_ACCOUNTS_TEMPLATE } from "../src/accounting/chart-of-accounts";
import { hashPasswordDeterministic } from "../src/common/password";
import {
  DocumentEntityType,
  DocumentKind,
  MonthlyFirstEmiOption,
  PaymentFrequency,
  PrismaClient,
  UserRole,
} from "../src/generated/prisma";

const prisma = new PrismaClient();

/** Matches apps/loan-mate SEED_PASSWORD / quick-login. */
const SEED_PASSWORD = "password";
const SEED_SALT = "a".repeat(32);

function pwd() {
  return hashPasswordDeterministic(SEED_PASSWORD, SEED_SALT);
}

async function main() {
  console.log("Seeding loan-mate…");

  await prisma.notification.deleteMany();
  await prisma.journalLine.deleteMany();
  await prisma.journalEntry.deleteMany();
  await prisma.account.deleteMany();
  await prisma.document.deleteMany();
  await prisma.loanClosure.deleteMany();
  await prisma.loanRestructure.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.paymentAllocation.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.approvalRequest.deleteMany();
  await prisma.installment.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.loanProduct.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.companySettings.deleteMany();
  await prisma.company.deleteMany();
  await prisma.sequence.deleteMany();
  await prisma.outboxEvent.deleteMany();

  const systemAdmin = await prisma.user.create({
    data: {
      email: "admin@loan-mate.local",
      name: "System Admin",
      role: UserRole.SYSTEM_ADMIN,
      passwordHash: pwd(),
    },
  });

  const company = await prisma.company.create({
    data: {
      name: "Acme NBFC",
      slug: "acme",
      settings: {
        create: {
          graceDays: 2,
          penaltyDailyPercent: "0.1000",
          defaultMonthlyFirstEmiOption: MonthlyFirstEmiOption.EXACT_DAY,
          foreclosureChargePercent: "2.0000",
          maxRestructures: 3,
        },
      },
    },
  });

  for (const row of CHART_OF_ACCOUNTS_TEMPLATE) {
    await prisma.account.create({
      data: {
        companyId: company.id,
        code: row.code,
        name: row.name,
        type: row.type,
      },
    });
  }

  const branch = await prisma.branch.create({
    data: {
      companyId: company.id,
      name: "Acme HQ",
      code: "HQ",
    },
  });

  const owner = await prisma.user.create({
    data: {
      email: "owner@loan-mate.local",
      name: "Company Owner",
      role: UserRole.COMPANY_OWNER,
      companyId: company.id,
      passwordHash: pwd(),
    },
  });

  const companyAdmin = await prisma.user.create({
    data: {
      email: "admin.company@loan-mate.local",
      name: "Company Admin",
      role: UserRole.COMPANY_ADMIN,
      companyId: company.id,
      passwordHash: pwd(),
    },
  });

  const branchManager = await prisma.user.create({
    data: {
      email: "branch@loan-mate.local",
      name: "Branch Manager",
      role: UserRole.BRANCH_MANAGER,
      companyId: company.id,
      branchId: branch.id,
      passwordHash: pwd(),
    },
  });

  const loanOfficer = await prisma.user.create({
    data: {
      email: "officer@loan-mate.local",
      name: "Loan Officer",
      role: UserRole.LOAN_OFFICER,
      companyId: company.id,
      branchId: branch.id,
      passwordHash: pwd(),
    },
  });

  const approver = await prisma.user.create({
    data: {
      email: "approver@loan-mate.local",
      name: "Approver",
      role: UserRole.APPROVER,
      companyId: company.id,
      branchId: branch.id,
      passwordHash: pwd(),
    },
  });

  const collector = await prisma.user.create({
    data: {
      email: "collections@loan-mate.local",
      name: "Collection Officer",
      role: UserRole.COLLECTION_OFFICER,
      companyId: company.id,
      branchId: branch.id,
      passwordHash: pwd(),
    },
  });

  const product = await prisma.loanProduct.create({
    data: {
      companyId: company.id,
      name: "Personal Loan Standard",
      code: "PL-STD",
      defaultPrincipal: "100000.00",
      defaultAnnualRate: "18.0000",
      annualRateWeekly: "16.0000",
      annualRateBiweekly: "17.0000",
      annualRateMonthly: "18.0000",
      defaultTenure: 12,
      defaultFrequency: PaymentFrequency.MONTHLY,
      defaultMonthlyFirstEmi: MonthlyFirstEmiOption.EXACT_DAY,
      processingFeePercent: "1.0000",
    },
  });

  await prisma.sequence.create({ data: { name: "CUST", value: 1 } });
  const customer = await prisma.customer.create({
    data: {
      companyId: company.id,
      customerNumber: "CUST-000001",
      name: "Ravi Kumar",
      mobile: "9876543210",
      pan: "ABCDE1234F",
      address: "12 MG Road, Bengaluru",
      createdById: loanOfficer.id,
      collectionOfficerId: collector.id,
    },
  });

  await prisma.document.create({
    data: {
      companyId: company.id,
      entityType: DocumentEntityType.CUSTOMER,
      entityId: customer.id,
      kind: DocumentKind.KYC_PAN,
      objectKey: "seed/kyc-pan.pdf",
      fileName: "pan.pdf",
      contentType: "application/pdf",
      uploadedById: owner.id,
    },
  });

  console.log({
    password: SEED_PASSWORD,
    systemAdmin: systemAdmin.email,
    company: company.slug,
    branch: branch.code,
    owner: owner.email,
    companyAdmin: companyAdmin.email,
    branchManager: branchManager.email,
    loanOfficer: loanOfficer.email,
    approver: approver.email,
    collector: collector.email,
    product: product.code,
    customer: customer.customerNumber,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
