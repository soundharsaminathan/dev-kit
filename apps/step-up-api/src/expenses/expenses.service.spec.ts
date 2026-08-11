import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import {
  ExpensePaymentMethod,
  ExpenseRecurrenceFrequency,
  Prisma,
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPrismaMock } from "../test/mocks/create-prisma-mock";
import { ExpensesService } from "./expenses.service";

function makePrisma() {
  const prisma = createPrismaMock({
    expenseCategory: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    expense: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    recurringExpense: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
  });
  return prisma as never as Record<string, never>;
}

function makeBillingStub() {
  return {
    listByStudio: vi.fn().mockResolvedValue([]),
  };
}

function makeMediaStub() {
  return {
    signReadUrl: vi.fn(async (value: string | null | undefined) =>
      value ? `signed-${value}` : null,
    ),
  };
}

function categoryFixture(id: string, name: string) {
  return {
    id,
    studioId: "studio-1",
    name,
    icon: null,
    isDefault: true,
    archivedAt: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  };
}

function expenseFixture(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "exp-1",
    studioId: "studio-1",
    branchId: null,
    amount: new Prisma.Decimal(1200),
    expenseDate: new Date("2026-07-15T00:00:00.000Z"),
    categoryId: "cat-rent",
    vendor: "Landlord",
    paymentMethod: ExpensePaymentMethod.BANK_TRANSFER,
    description: "Monthly rent",
    notes: null,
    receiptKey: null,
    recurringExpenseId: null,
    createdById: "owner-1",
    updatedById: null,
    archivedAt: null,
    createdAt: new Date("2026-07-15"),
    updatedAt: new Date("2026-07-15"),
    category: { id: "cat-rent", name: "Rent", icon: "building" },
    ...overrides,
  };
}

describe("ExpensesService", () => {
  let prisma: ReturnType<typeof makePrisma>;
  let billing: ReturnType<typeof makeBillingStub>;
  let media: ReturnType<typeof makeMediaStub>;
  let service: ExpensesService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    billing = makeBillingStub();
    media = makeMediaStub();
    service = new ExpensesService(
      prisma as never,
      billing as never,
      media as never,
    );
  });

  describe("ensureDefaultCategories", () => {
    it("creates missing default categories", async () => {
      (
        prisma.expenseCategory.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue([{ name: "Rent" }]);
      (
        prisma.expenseCategory.create as ReturnType<typeof vi.fn>
      ).mockResolvedValue({});

      await service.ensureDefaultCategories("studio-1");

      const create = prisma.expenseCategory.create as ReturnType<typeof vi.fn>;
      expect(create).toHaveBeenCalledTimes(12);
      expect(create.mock.calls[0][0].data).toMatchObject({
        studioId: "studio-1",
        name: "Utilities",
        isDefault: true,
      });
    });

    it("does not recreate existing categories", async () => {
      (
        prisma.expenseCategory.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue([
        { name: "Rent" },
        { name: "Utilities" },
        { name: "Salaries" },
        { name: "Trainer Payouts" },
        { name: "Equipment" },
        { name: "Costumes" },
        { name: "Events" },
        { name: "Marketing" },
        { name: "Maintenance" },
        { name: "Travel" },
        { name: "Software" },
        { name: "Office Supplies" },
        { name: "Other" },
      ]);

      await service.ensureDefaultCategories("studio-1");

      expect(prisma.expenseCategory.create).not.toHaveBeenCalled();
    });
  });

  describe("createExpense", () => {
    it("creates an expense for the actor's studio", async () => {
      (
        prisma.expenseCategory.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValue(categoryFixture("cat-rent", "Rent"));
      const created = expenseFixture();
      (prisma.expense.create as ReturnType<typeof vi.fn>).mockResolvedValue(
        created,
      );

      const result = await service.createExpense("owner-1", "studio-1", {
        studioId: "studio-1",
        amount: 1200,
        expenseDate: "2026-07-15",
        categoryId: "cat-rent",
        vendor: "Landlord",
        paymentMethod: ExpensePaymentMethod.BANK_TRANSFER,
        description: "Monthly rent",
      });

      expect(prisma.expense.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          studioId: "studio-1",
          amount: 1200,
          expenseDate: new Date("2026-07-15T00:00:00.000Z"),
          categoryId: "cat-rent",
          createdById: "owner-1",
        }),
      });
      expect(result).toEqual(created);
    });

    it("rejects cross-studio creation", async () => {
      await expect(
        service.createExpense("owner-1", "studio-1", {
          studioId: "studio-other",
          amount: 100,
          expenseDate: "2026-07-15",
          categoryId: "cat-rent",
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("rejects non-positive amounts", async () => {
      await expect(
        service.createExpense("owner-1", "studio-1", {
          studioId: "studio-1",
          amount: 0,
          expenseDate: "2026-07-15",
          categoryId: "cat-rent",
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.createExpense("owner-1", "studio-1", {
          studioId: "studio-1",
          amount: -5,
          expenseDate: "2026-07-15",
          categoryId: "cat-rent",
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects invalid dates", async () => {
      await expect(
        service.createExpense("owner-1", "studio-1", {
          studioId: "studio-1",
          amount: 100,
          expenseDate: "not-a-date",
          categoryId: "cat-rent",
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects unknown categories", async () => {
      (
        prisma.expenseCategory.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValue(null);
      await expect(
        service.createExpense("owner-1", "studio-1", {
          studioId: "studio-1",
          amount: 100,
          expenseDate: "2026-07-15",
          categoryId: "cat-missing",
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("updateExpense", () => {
    it("updates fields and trims text", async () => {
      (prisma.expense.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        expenseFixture(),
      );
      (
        prisma.expenseCategory.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValue(categoryFixture("cat-mkt", "Marketing"));
      const updated = expenseFixture({ amount: new Prisma.Decimal(1500) });
      (prisma.expense.update as ReturnType<typeof vi.fn>).mockResolvedValue(
        updated,
      );

      const result = await service.updateExpense(
        "owner-1",
        "exp-1",
        "studio-1",
        {
          amount: 1500,
          categoryId: "cat-mkt",
          vendor: "  New Vendor  ",
          description: "",
        },
      );

      expect(prisma.expense.update).toHaveBeenCalledWith({
        where: { id: "exp-1" },
        data: expect.objectContaining({
          amount: 1500,
          categoryId: "cat-mkt",
          vendor: "New Vendor",
          description: null,
          updatedById: "owner-1",
        }),
        include: expect.anything(),
      });
      expect(result.amount).toBe(1500);
    });

    it("rejects invalid amounts", async () => {
      (prisma.expense.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        expenseFixture(),
      );
      await expect(
        service.updateExpense("owner-1", "exp-1", "studio-1", { amount: -1 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects expenses outside the studio", async () => {
      (prisma.expense.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );
      await expect(
        service.updateExpense("owner-1", "exp-1", "studio-1", { vendor: "X" }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("deleteExpense", () => {
    it("soft-deletes via archivedAt", async () => {
      (prisma.expense.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        expenseFixture(),
      );
      (prisma.expense.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const result = await service.deleteExpense("exp-1", "studio-1");

      expect(prisma.expense.update).toHaveBeenCalledWith({
        where: { id: "exp-1" },
        data: { archivedAt: expect.any(Date) },
      });
      expect(result).toEqual({ id: "exp-1" });
    });

    it("rejects unknown expenses", async () => {
      (prisma.expense.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );
      await expect(
        service.deleteExpense("nope", "studio-1"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("getExpense", () => {
    it("returns the expense with numeric amount", async () => {
      (prisma.expense.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        expenseFixture(),
      );
      (prisma.expense.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        expenseFixture(),
      );

      const result = await service.getExpense("exp-1", "studio-1");
      expect(result.amount).toBe(1200);
      expect(result.category.name).toBe("Rent");
    });

    it("rejects cross-studio access", async () => {
      (prisma.expense.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );
      await expect(
        service.getExpense("exp-1", "studio-1"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("listExpenses", () => {
    it("applies date, category, vendor, amount and search filters", async () => {
      (
        prisma.expenseCategory.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue([]);
      (prisma.expense.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        expenseFixture(),
      ]);
      (prisma.expense.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);

      await service.listExpenses("studio-1", {
        from: "2026-07-01",
        to: "2026-07-31",
        categoryId: "cat-rent",
        vendor: "land",
        paymentMethod: ExpensePaymentMethod.BANK_TRANSFER,
        minAmount: 100,
        maxAmount: 5000,
        search: "rent",
        sort: "amount",
        order: "desc",
        page: 1,
        pageSize: 25,
      });

      const where = (prisma.expense.findMany as ReturnType<typeof vi.fn>).mock
        .calls[0][0].where;
      expect(where.studioId).toBe("studio-1");
      expect(where.archivedAt).toBeNull();
      expect(where.expenseDate).toMatchObject({
        gte: new Date("2026-07-01T00:00:00.000Z"),
        lte: new Date("2026-07-31T23:59:59.999Z"),
      });
      expect(where.categoryId).toBe("cat-rent");
      expect(where.vendor).toEqual({ contains: "land", mode: "insensitive" });
      expect(where.paymentMethod).toBe(ExpensePaymentMethod.BANK_TRANSFER);
      expect(where.amount).toMatchObject({ gte: 100, lte: 5000 });
      expect(where.OR).toEqual([
        { vendor: { contains: "rent", mode: "insensitive" } },
        { description: { contains: "rent", mode: "insensitive" } },
        { notes: { contains: "rent", mode: "insensitive" } },
      ]);
    });

    it("paginates and reports hasMore", async () => {
      (
        prisma.expenseCategory.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue([]);
      (prisma.expense.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        expenseFixture(),
      ]);
      (prisma.expense.count as ReturnType<typeof vi.fn>).mockResolvedValue(30);

      const result = await service.listExpenses("studio-1", {
        page: 2,
        pageSize: 10,
      });

      expect(result.total).toBe(30);
      expect(result.page).toBe(2);
      expect(result.hasMore).toBe(true);
      expect(
        (prisma.expense.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0],
      ).toMatchObject({
        skip: 10,
        take: 10,
      });
    });

    it("defaults to date desc ordering", async () => {
      (
        prisma.expenseCategory.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue([]);
      (prisma.expense.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
        [],
      );
      (prisma.expense.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      await service.listExpenses("studio-1", {});

      const call = (prisma.expense.findMany as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(call.orderBy).toEqual({ expenseDate: "desc" });
    });
  });

  describe("getDashboard", () => {
    function monthStart(offsetMonths: number) {
      const now = new Date();
      return new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offsetMonths, 1),
      );
    }

    it("computes summary cards, trend, categories, and recent", async () => {
      const thisMonthDate = monthStart(0);
      const prevMonthDate = monthStart(-1);
      const fixtures = [
        expenseFixture({
          id: "e1",
          amount: new Prisma.Decimal(1000),
          expenseDate: thisMonthDate,
        }),
        expenseFixture({
          id: "e2",
          amount: new Prisma.Decimal(2000),
          expenseDate: new Date(thisMonthDate.getTime() + 24 * 60 * 60 * 1000),
        }),
        expenseFixture({
          id: "e3",
          amount: new Prisma.Decimal(500),
          expenseDate: prevMonthDate,
          categoryId: "cat-mkt",
          category: { id: "cat-mkt", name: "Marketing", icon: "megaphone" },
        }),
      ];
      (
        prisma.expenseCategory.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue([]);
      (prisma.expense.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
        [...fixtures].sort(
          (a, b) =>
            new Date(b.expenseDate as Date).getTime() -
            new Date(a.expenseDate as Date).getTime(),
        ),
      );

      const result = await service.getDashboard("studio-1", {});

      expect(result.summaryCards.thisMonth).toBe(3000);
      expect(result.summaryCards.prevMonth).toBe(500);
      expect(result.summaryCards.largestCategory).toMatchObject({
        categoryName: "Rent",
      });
      expect(result.byCategory[0]).toMatchObject({
        categoryName: "Rent",
        amount: 3000,
      });
      expect(result.recent).toHaveLength(3);
      expect(result.recent[0].amount).toBe(2000);
    });

    it("returns empty-safe values when no expenses exist", async () => {
      (
        prisma.expenseCategory.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue([]);
      (prisma.expense.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
        [],
      );

      const result = await service.getDashboard("studio-1", {});

      expect(result.summaryCards.thisMonth).toBe(0);
      expect(result.summaryCards.thisYear).toBe(0);
      expect(result.summaryCards.largestCategory).toBeNull();
      expect(result.byCategory).toEqual([]);
      expect(
        result.trend.series.every(
          (point: { amount: number }) => point.amount === 0,
        ),
      ).toBe(true);
      expect(result.recent).toEqual([]);
    });
  });

  describe("getReports", () => {
    it("builds monthly, category and vendor reports", async () => {
      (
        prisma.expenseCategory.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue([]);
      (prisma.expense.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        expenseFixture({
          id: "e1",
          amount: new Prisma.Decimal(1000),
          expenseDate: new Date("2026-07-01T00:00:00.000Z"),
          vendor: "Landlord",
        }),
        expenseFixture({
          id: "e2",
          amount: new Prisma.Decimal(500),
          expenseDate: new Date("2026-07-10T00:00:00.000Z"),
          vendor: "Landlord",
        }),
        expenseFixture({
          id: "e3",
          amount: new Prisma.Decimal(300),
          expenseDate: new Date("2026-08-05T00:00:00.000Z"),
          categoryId: "cat-mkt",
          vendor: "Meta Ads",
          category: { id: "cat-mkt", name: "Marketing", icon: "megaphone" },
        }),
      ]);

      const result = await service.getReports("studio-1", {
        from: "2026-07-01",
        to: "2026-08-31",
      });

      expect(result.totals).toEqual({ amount: 1800, count: 3 });
      expect(result.monthly[0]).toEqual({
        month: "2026-07",
        total: 1500,
        count: 2,
      });
      expect(result.monthly[1]).toEqual({
        month: "2026-08",
        total: 300,
        count: 1,
      });
      expect(result.byCategory[0]).toMatchObject({
        categoryName: "Rent",
        total: 1500,
      });
      expect(result.byVendor[0]).toMatchObject({
        vendor: "Landlord",
        total: 1500,
        count: 2,
      });
    });
  });

  describe("getFinancialOverview", () => {
    it("combines revenue from billing and expenses", async () => {
      (
        prisma.expenseCategory.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue([]);
      billing.listByStudio.mockResolvedValue([
        {
          id: "inv-1",
          status: "PAID",
          paidAt: new Date("2026-07-10T00:00:00.000Z"),
          amount: 5000,
          referralDiscount: 0,
          studioDiscount: 200,
          familyDiscount: 0,
          refundedAmount: 0,
        },
        {
          id: "inv-2",
          status: "PENDING",
          paidAt: null,
          amount: 999,
          referralDiscount: 0,
          studioDiscount: 0,
          familyDiscount: 0,
          refundedAmount: 0,
        },
        {
          id: "inv-3",
          status: "PAID",
          paidAt: new Date("2026-01-01T00:00:00.000Z"),
          amount: 999,
          referralDiscount: 0,
          studioDiscount: 0,
          familyDiscount: 0,
          refundedAmount: 0,
        },
      ]);
      (prisma.expense.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          amount: new Prisma.Decimal(1000),
          expenseDate: new Date("2026-07-05"),
        },
      ]);

      const result = await service.getFinancialOverview("studio-1", {
        from: "2026-07-01",
        to: "2026-07-31",
      });

      expect(billing.listByStudio).toHaveBeenCalledWith("studio-1");
      expect(result.revenue).toBe(4800);
      expect(result.expenses).toBe(1000);
      expect(result.net).toBe(3800);
    });

    it("accounts for refunds", async () => {
      (
        prisma.expenseCategory.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue([]);
      billing.listByStudio.mockResolvedValue([
        {
          id: "inv-1",
          status: "PAID",
          paidAt: new Date("2026-07-10T00:00:00.000Z"),
          amount: 1000,
          referralDiscount: 0,
          studioDiscount: 0,
          familyDiscount: 0,
          refundedAmount: 400,
        },
      ]);
      (prisma.expense.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
        [],
      );

      const result = await service.getFinancialOverview("studio-1", {
        from: "2026-07-01",
        to: "2026-07-31",
      });
      expect(result.revenue).toBe(600);
    });
  });

  describe("recurring expenses", () => {
    it("creates a recurring expense with initial next occurrence", async () => {
      (
        prisma.expenseCategory.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValue(categoryFixture("cat-rent", "Rent"));
      (
        prisma.recurringExpense.create as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        id: "rec-1",
      });

      await service.createRecurringExpense("owner-1", "studio-1", {
        studioId: "studio-1",
        categoryId: "cat-rent",
        amount: 12000,
        frequency: ExpenseRecurrenceFrequency.MONTHLY,
        startDate: "2026-07-01",
      });

      expect(prisma.recurringExpense.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          studioId: "studio-1",
          amount: 12000,
          frequency: ExpenseRecurrenceFrequency.MONTHLY,
          nextOccurrence: new Date("2026-07-01T00:00:00.000Z"),
          createdById: "owner-1",
        }),
      });
    });

    it("rejects end dates before start dates", async () => {
      (
        prisma.expenseCategory.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValue(categoryFixture("cat-rent", "Rent"));
      await expect(
        service.createRecurringExpense("owner-1", "studio-1", {
          studioId: "studio-1",
          categoryId: "cat-rent",
          amount: 1000,
          frequency: ExpenseRecurrenceFrequency.MONTHLY,
          startDate: "2026-07-01",
          endDate: "2026-06-01",
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("materializes due occurrences exactly once", async () => {
      const today = new Date("2026-08-10T12:00:00.000Z");
      const due = [
        {
          id: "rec-1",
          studioId: "studio-1",
          categoryId: "cat-rent",
          amount: new Prisma.Decimal(12000),
          frequency: ExpenseRecurrenceFrequency.MONTHLY,
          nextOccurrence: new Date("2026-07-01T00:00:00.000Z"),
          endDate: null,
          vendor: "Landlord",
          paymentMethod: null,
          description: null,
          notes: null,
          active: true,
          archivedAt: null,
        },
      ];
      (
        prisma.recurringExpense.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue(due);
      (prisma.expense.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (
        prisma.recurringExpense.update as ReturnType<typeof vi.fn>
      ).mockResolvedValue({});

      const first = await service.materializeDueRecurringExpenses(
        "studio-1",
        "owner-1",
        today,
      );
      expect(first.created).toBe(2);
      expect(prisma.expense.create).toHaveBeenCalledTimes(2);
      expect(
        (
          prisma.expense.create as ReturnType<typeof vi.fn>
        ).mock.calls[0][0].data.expenseDate.toISOString(),
      ).toBe("2026-07-01T00:00:00.000Z");
      expect(
        (
          prisma.expense.create as ReturnType<typeof vi.fn>
        ).mock.calls[1][0].data.expenseDate.toISOString(),
      ).toBe("2026-08-01T00:00:00.000Z");
      expect(prisma.recurringExpense.update).toHaveBeenCalledWith({
        where: { id: "rec-1" },
        data: { nextOccurrence: new Date("2026-09-01T00:00:00.000Z") },
      });

      // Re-running creates nothing new — nextOccurrence was advanced.
      (
        prisma.recurringExpense.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue([]);
      const second = await service.materializeDueRecurringExpenses(
        "studio-1",
        "owner-1",
        today,
      );
      expect(second.created).toBe(0);
    });

    it("respects end dates and deactivates finished series", async () => {
      const today = new Date("2026-08-10T12:00:00.000Z");
      const due = [
        {
          id: "rec-1",
          studioId: "studio-1",
          categoryId: "cat-rent",
          amount: new Prisma.Decimal(1000),
          frequency: ExpenseRecurrenceFrequency.MONTHLY,
          nextOccurrence: new Date("2026-07-01T00:00:00.000Z"),
          endDate: new Date("2026-08-01T00:00:00.000Z"),
          vendor: null,
          paymentMethod: null,
          description: null,
          notes: null,
          active: true,
          archivedAt: null,
        },
      ];
      (
        prisma.recurringExpense.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue(due);
      (prisma.expense.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (
        prisma.recurringExpense.update as ReturnType<typeof vi.fn>
      ).mockResolvedValue({});

      const result = await service.materializeDueRecurringExpenses(
        "studio-1",
        "owner-1",
        today,
      );
      expect(result.created).toBe(2);
      expect(prisma.recurringExpense.update).toHaveBeenCalledWith({
        where: { id: "rec-1" },
        data: {
          nextOccurrence: new Date("2026-09-01T00:00:00.000Z"),
          active: false,
        },
      });
    });
  });

  describe("categories", () => {
    it("rejects duplicate category names", async () => {
      (
        prisma.expenseCategory.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue([]);
      (
        prisma.expenseCategory.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValue(categoryFixture("cat-rent", "Rent"));
      await expect(
        service.createCategory("owner-1", {
          studioId: "studio-1",
          name: "Rent",
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects deleting categories that have expenses", async () => {
      (
        prisma.expenseCategory.findUnique as ReturnType<typeof vi.fn>
      ).mockResolvedValue(categoryFixture("cat-rent", "Rent"));
      (prisma.expense.count as ReturnType<typeof vi.fn>).mockResolvedValue(3);
      await expect(service.deleteCategory("cat-rent")).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.expenseCategory.update).not.toHaveBeenCalled();
    });

    it("archives unused categories", async () => {
      (
        prisma.expenseCategory.findUnique as ReturnType<typeof vi.fn>
      ).mockResolvedValue(categoryFixture("cat-mkt", "Marketing"));
      (prisma.expense.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
      (
        prisma.expenseCategory.update as ReturnType<typeof vi.fn>
      ).mockResolvedValue({});

      const result = await service.deleteCategory("cat-mkt");
      expect(result).toEqual({ id: "cat-mkt" });
      expect(prisma.expenseCategory.update).toHaveBeenCalledWith({
        where: { id: "cat-mkt" },
        data: { archivedAt: expect.any(Date) },
      });
    });
  });
});
