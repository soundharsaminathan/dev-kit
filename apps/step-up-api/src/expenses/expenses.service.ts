import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  type Expense,
  type ExpensePaymentMethod,
  type ExpenseRecurrenceFrequency,
  Prisma,
} from "@prisma/client";
import { BillingService } from "../billing/billing.service";
import { MediaService } from "../media/media.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  type AnalyticsBucket,
  buildCategoryReport,
  buildExpenseSeries,
  buildMonthlyReport,
  buildVendorReport,
  computeNextOccurrence,
  deltaPct,
  endOfExpenseDate,
  inferBucket,
  parseExpenseDate,
  periodTotals,
  previousPeriodFor,
  roundMoney,
} from "./expense-helpers";

export const DEFAULT_EXPENSE_CATEGORIES = [
  "Rent",
  "Utilities",
  "Salaries",
  "Trainer Payouts",
  "Equipment",
  "Costumes",
  "Events",
  "Marketing",
  "Maintenance",
  "Travel",
  "Software",
  "Office Supplies",
  "Other",
] as const;

const CATEGORY_ICON_CANDIDATES = [
  "building",
  "zap",
  "users",
  "user",
  "dumbbell",
  "shirt",
  "calendar",
  "megaphone",
  "wrench",
  "plane",
  "monitor",
  "package",
  "more-horizontal",
];

function iconForCategoryName(name: string): string {
  const index = DEFAULT_EXPENSE_CATEGORIES.indexOf(name as never);
  if (index >= 0) {
    return CATEGORY_ICON_CANDIDATES[index]!;
  }
  return "more-horizontal";
}

function parseDate(value: string, label: string): Date {
  const date = parseExpenseDate(value);
  if (!date) {
    throw new BadRequestException(`${label} must be a valid date`);
  }
  return date;
}

function parseEndDate(value: string, label: string): Date {
  const date = endOfExpenseDate(value);
  if (!date) {
    throw new BadRequestException(`${label} must be a valid date`);
  }
  return date;
}

function normalizeRange(from: Date, to: Date): { from: Date; to: Date } {
  if (from.getTime() > to.getTime()) {
    throw new BadRequestException("from cannot be after to");
  }
  return { from: new Date(from.getTime()), to: new Date(to.getTime()) };
}

export type CreateExpenseInput = {
  studioId: string;
  branchId?: string | null;
  amount: number;
  expenseDate: string;
  categoryId: string;
  vendor?: string | null;
  paymentMethod?: string | null;
  description?: string | null;
  notes?: string | null;
  receiptKey?: string | null;
  recurringExpenseId?: string | null;
};

export type UpdateExpenseInput = Partial<
  Omit<CreateExpenseInput, "studioId" | "recurringExpenseId">
>;

export type CreateCategoryInput = {
  studioId: string;
  name: string;
  icon?: string | null;
};

export type UpdateCategoryInput = Partial<
  Omit<CreateCategoryInput, "studioId">
>;

export type CreateRecurringExpenseInput = {
  studioId: string;
  categoryId: string;
  amount: number;
  frequency: string;
  startDate: string;
  endDate?: string | null;
  vendor?: string | null;
  paymentMethod?: string | null;
  description?: string | null;
  notes?: string | null;
};

export type UpdateRecurringExpenseInput = Partial<
  Omit<CreateRecurringExpenseInput, "studioId">
>;

export type ListExpensesQuery = {
  from?: string | null;
  to?: string | null;
  categoryId?: string | null;
  vendor?: string | null;
  paymentMethod?: string | null;
  minAmount?: number | null;
  maxAmount?: number | null;
  search?: string | null;
  sort?: "date" | "amount" | "category" | "vendor";
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

function orderByFor(
  query: ListExpensesQuery,
): Prisma.ExpenseOrderByWithRelationInput {
  const direction: Prisma.SortOrder = query.order === "asc" ? "asc" : "desc";
  switch (query.sort) {
    case "amount":
      return { amount: direction };
    case "category":
      return { category: { name: direction } };
    case "vendor":
      return { vendor: direction };
    default:
      return { expenseDate: direction };
  }
}

@Injectable()
export class ExpensesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(BillingService) private readonly billingService: BillingService,
    @Inject(MediaService) private readonly mediaService: MediaService,
  ) {}

  private async assertExpenseInStudio(
    id: string,
    studioId: string,
  ): Promise<Expense> {
    const expense = await this.prisma.expense.findFirst({
      where: { id, studioId, archivedAt: null },
    });
    if (!expense) {
      throw new NotFoundException("Expense not found");
    }
    return expense;
  }

  private async assertCategoryInStudio(id: string, studioId: string) {
    const category = await this.prisma.expenseCategory.findFirst({
      where: { id, studioId },
    });
    if (!category) {
      throw new NotFoundException("Expense category not found");
    }
    return category;
  }

  private async assertRecurringInStudio(id: string, studioId: string) {
    const recurring = await this.prisma.recurringExpense.findFirst({
      where: { id, studioId, archivedAt: null },
    });
    if (!recurring) {
      throw new NotFoundException("Recurring expense not found");
    }
    return recurring;
  }

  async ensureDefaultCategories(studioId: string): Promise<void> {
    const existing = await this.prisma.expenseCategory.findMany({
      where: { studioId, archivedAt: null },
      select: { name: true },
    });
    const existingNames = new Set(existing.map((category) => category.name));
    for (const name of DEFAULT_EXPENSE_CATEGORIES) {
      if (existingNames.has(name)) {
        continue;
      }
      try {
        await this.prisma.expenseCategory.create({
          data: {
            studioId,
            name,
            icon: iconForCategoryName(name),
            isDefault: true,
          },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          // Concurrent creation — a category with this name already exists.
        } else {
          throw error;
        }
      }
    }
  }

  async listCategories(studioId: string) {
    await this.ensureDefaultCategories(studioId);
    return this.prisma.expenseCategory.findMany({
      where: { studioId, archivedAt: null },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      include: { _count: { select: { expenses: true } } },
    });
  }

  async createCategory(actorId: string, input: CreateCategoryInput) {
    await this.ensureDefaultCategories(input.studioId);
    const name = input.name.trim();
    if (!name) {
      throw new BadRequestException("Category name is required");
    }
    const existing = await this.prisma.expenseCategory.findFirst({
      where: { studioId: input.studioId, name, archivedAt: null },
    });
    if (existing) {
      throw new BadRequestException("A category with this name already exists");
    }
    return this.prisma.expenseCategory.create({
      data: {
        studioId: input.studioId,
        name,
        icon: input.icon?.trim() || "more-horizontal",
        isDefault: false,
        createdById: actorId,
      },
    });
  }

  async updateCategory(
    actorId: string,
    id: string,
    input: UpdateCategoryInput,
  ) {
    const existing = await this.prisma.expenseCategory.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException("Expense category not found");
    }
    const data: Prisma.ExpenseCategoryUncheckedUpdateInput = {
      updatedById: actorId,
    };
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) {
        throw new BadRequestException("Category name is required");
      }
      const clash = await this.prisma.expenseCategory.findFirst({
        where: {
          studioId: existing.studioId,
          name,
          archivedAt: null,
          id: { not: id },
        },
      });
      if (clash) {
        throw new BadRequestException(
          "A category with this name already exists",
        );
      }
      data.name = name;
    }
    if (input.icon !== undefined) {
      data.icon = input.icon?.trim() || null;
    }
    return this.prisma.expenseCategory.update({ where: { id }, data });
  }

  async deleteCategory(id: string): Promise<{ id: string }> {
    const existing = await this.prisma.expenseCategory.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException("Expense category not found");
    }
    const usage = await this.prisma.expense.count({
      where: { categoryId: id, archivedAt: null },
    });
    if (usage > 0) {
      throw new BadRequestException(
        "Cannot delete a category that has expenses. Archive it instead.",
      );
    }
    await this.prisma.expenseCategory.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
    return { id };
  }

  private buildListWhere(studioId: string, query: ListExpensesQuery) {
    const where: Prisma.ExpenseWhereInput = {
      studioId,
      archivedAt: null,
    };
    const dateFilter: Prisma.DateTimeFilter = {};
    if (query.from) {
      dateFilter.gte = parseDate(query.from, "from");
    }
    if (query.to) {
      dateFilter.lte = parseEndDate(query.to, "to");
    }
    if (query.from || query.to) {
      where.expenseDate = dateFilter;
    }
    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }
    if (query.vendor) {
      where.vendor = { contains: query.vendor, mode: "insensitive" };
    }
    if (query.paymentMethod) {
      where.paymentMethod = query.paymentMethod as ExpensePaymentMethod;
    }
    const amountFilter: Prisma.DecimalFilter = {};
    if (query.minAmount != null) {
      amountFilter.gte = query.minAmount;
    }
    if (query.maxAmount != null) {
      amountFilter.lte = query.maxAmount;
    }
    if (query.minAmount != null || query.maxAmount != null) {
      where.amount = amountFilter;
    }
    if (query.search) {
      where.OR = [
        { vendor: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
        { notes: { contains: query.search, mode: "insensitive" } },
      ];
    }
    return where;
  }

  async listExpenses(studioId: string, query: ListExpensesQuery = {}) {
    await this.ensureDefaultCategories(studioId);
    const where = this.buildListWhere(studioId, query);
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 25));
    const orderBy = orderByFor(query);

    const [items, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        include: { category: { select: { id: true, name: true, icon: true } } },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.expense.count({ where }),
    ]);

    return {
      items: await this.serializeExpenses(items),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    };
  }

  private async signReceipt(
    item: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const receiptKey = item.receiptKey ? String(item.receiptKey) : null;
    if (!receiptKey) {
      return { ...item, receiptUrl: null };
    }
    return {
      ...item,
      receiptUrl: await this.mediaService.signReadUrl(receiptKey),
    };
  }

  private async serializeExpenses(
    items: Array<Record<string, unknown>>,
  ): Promise<Array<Record<string, unknown>>> {
    const serialized = items.map((expense) => ({
      ...expense,
      amount: Number(expense.amount),
    }));
    return Promise.all(serialized.map((expense) => this.signReceipt(expense)));
  }

  async getExpense(id: string, studioId: string) {
    await this.assertExpenseInStudio(id, studioId);
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, icon: true } },
        recurringExpense: {
          select: { id: true, frequency: true, nextOccurrence: true },
        },
      },
    });
    if (!expense) {
      throw new NotFoundException("Expense not found");
    }
    return this.signReceipt({ ...expense, amount: Number(expense.amount) });
  }

  async createExpense(
    actorId: string,
    actorStudioId: string,
    input: CreateExpenseInput,
  ) {
    if (input.studioId !== actorStudioId) {
      throw new ForbiddenException(
        "Expenses can only be created for your studio",
      );
    }
    if (input.amount <= 0) {
      throw new BadRequestException("Amount must be greater than 0");
    }
    const expenseDate = parseDate(input.expenseDate, "expenseDate");
    await this.assertCategoryInStudio(input.categoryId, input.studioId);
    if (input.recurringExpenseId) {
      await this.assertRecurringInStudio(
        input.recurringExpenseId,
        input.studioId,
      );
    }
    return this.prisma.expense.create({
      data: {
        studioId: input.studioId,
        branchId: input.branchId ?? null,
        amount: roundMoney(input.amount),
        expenseDate,
        categoryId: input.categoryId,
        vendor: input.vendor?.trim() || null,
        paymentMethod: (input.paymentMethod as ExpensePaymentMethod) ?? null,
        description: input.description?.trim() || null,
        notes: input.notes?.trim() || null,
        receiptKey: input.receiptKey ?? null,
        recurringExpenseId: input.recurringExpenseId ?? null,
        createdById: actorId,
      },
    });
  }

  async updateExpense(
    actorId: string,
    id: string,
    studioId: string,
    input: UpdateExpenseInput,
  ) {
    await this.assertExpenseInStudio(id, studioId);
    if (input.amount !== undefined && input.amount <= 0) {
      throw new BadRequestException("Amount must be greater than 0");
    }
    if (input.categoryId !== undefined) {
      await this.assertCategoryInStudio(input.categoryId, studioId);
    }
    const data: Prisma.ExpenseUncheckedUpdateInput = { updatedById: actorId };
    if (input.amount !== undefined) {
      data.amount = roundMoney(input.amount);
    }
    if (input.expenseDate !== undefined) {
      data.expenseDate = parseDate(input.expenseDate, "expenseDate");
    }
    if (input.categoryId !== undefined) {
      data.categoryId = input.categoryId;
    }
    if (input.vendor !== undefined) {
      data.vendor = input.vendor?.trim() || null;
    }
    if (input.paymentMethod !== undefined) {
      data.paymentMethod = input.paymentMethod as ExpensePaymentMethod;
    }
    if (input.description !== undefined) {
      data.description = input.description?.trim() || null;
    }
    if (input.notes !== undefined) {
      data.notes = input.notes?.trim() || null;
    }
    if (input.receiptKey !== undefined) {
      data.receiptKey = input.receiptKey;
    }
    if (input.branchId !== undefined) {
      data.branchId = input.branchId ?? null;
    }
    const updated = await this.prisma.expense.update({
      where: { id },
      data,
      include: { category: { select: { id: true, name: true, icon: true } } },
    });
    return { ...updated, amount: Number(updated.amount) };
  }

  async deleteExpense(id: string, studioId: string): Promise<{ id: string }> {
    await this.assertExpenseInStudio(id, studioId);
    await this.prisma.expense.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
    return { id };
  }

  async getDashboard(
    studioId: string,
    opts: { from?: string; to?: string; bucket?: string } = {},
  ) {
    await this.ensureDefaultCategories(studioId);
    const now = new Date();
    const thisMonthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const thisYearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const prevMonthEnd = new Date(thisMonthStart.getTime() - 1);
    const prevMonthStart = new Date(
      Date.UTC(prevMonthEnd.getUTCFullYear(), prevMonthEnd.getUTCMonth(), 1),
    );
    const monthsElapsedThisYear = now.getUTCMonth() + 1;

    const allExpenses = await this.prisma.expense.findMany({
      where: { studioId, archivedAt: null },
      include: { category: { select: { id: true, name: true, icon: true } } },
      orderBy: { expenseDate: "desc" },
    });

    const amountOf = (expense: { amount: Prisma.Decimal | number }) =>
      Number(expense.amount);
    const byRange = (from: Date, to: Date) =>
      allExpenses.filter(
        (expense) => expense.expenseDate >= from && expense.expenseDate <= to,
      );

    const thisMonth = roundMoney(
      byRange(thisMonthStart, now).reduce((sum, e) => sum + amountOf(e), 0),
    );
    const thisYear = roundMoney(
      byRange(thisYearStart, now).reduce((sum, e) => sum + amountOf(e), 0),
    );
    const prevMonth = roundMoney(
      byRange(prevMonthStart, prevMonthEnd).reduce(
        (sum, e) => sum + amountOf(e),
        0,
      ),
    );

    const categoryTotals = new Map<
      string,
      { name: string; icon: string | null; amount: number }
    >();
    for (const expense of allExpenses) {
      const bucket = categoryTotals.get(expense.categoryId) ?? {
        name: expense.category.name,
        icon: expense.category.icon,
        amount: 0,
      };
      bucket.amount += amountOf(expense);
      categoryTotals.set(expense.categoryId, bucket);
    }
    const largestEntry =
      categoryTotals.size > 0
        ? [...categoryTotals.entries()].sort(
            (a, b) => b[1].amount - a[1].amount,
          )[0]!
        : null;

    const from = opts.from ? parseDate(opts.from, "from") : thisYearStart;
    const to = opts.to ? new Date(`${opts.to}T23:59:59.999Z`) : now;
    const range = normalizeRange(from, to);
    const bucket: AnalyticsBucket =
      opts.bucket === "day" || opts.bucket === "week" || opts.bucket === "month"
        ? opts.bucket
        : inferBucket(range.from, range.to);

    const rangeExpenses = byRange(range.from, range.to);

    const trend = buildExpenseSeries({
      expenses: rangeExpenses.map((expense) => ({
        expenseDate: expense.expenseDate,
        amount: expense.amount,
      })),
      from: range.from,
      to: range.to,
      bucket,
    });

    const previous = previousPeriodFor(range.from, range.to);
    const previousAmount = periodTotals({
      expenses: allExpenses.map((expense) => ({
        expenseDate: expense.expenseDate,
        amount: expense.amount,
      })),
      from: previous.previousFrom,
      to: previous.previousTo,
    }).amount;

    const byCategory = [...categoryTotals.entries()]
      .map(([categoryId, bucket]) => ({
        categoryId,
        categoryName: bucket.name,
        icon: bucket.icon,
        amount: roundMoney(bucket.amount),
        percentage:
          thisYear > 0 ? roundMoney((bucket.amount / thisYear) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const methodTotals = new Map<string, { amount: number; count: number }>();
    for (const expense of rangeExpenses) {
      const method = expense.paymentMethod ?? "UNSPECIFIED";
      const bucket = methodTotals.get(method) ?? { amount: 0, count: 0 };
      bucket.amount += amountOf(expense);
      bucket.count += 1;
      methodTotals.set(method, bucket);
    }

    return {
      summaryCards: {
        thisMonth,
        thisYear,
        prevMonth,
        prevMonthDeltaPct: deltaPct(thisMonth, prevMonth),
        averageMonthly: roundMoney(thisYear / monthsElapsedThisYear),
        largestCategory: largestEntry
          ? {
              categoryId: largestEntry[0],
              categoryName: largestEntry[1].name,
              amount: roundMoney(largestEntry[1].amount),
            }
          : null,
      },
      trend: {
        from: range.from.toISOString(),
        to: range.to.toISOString(),
        bucket,
        series: trend,
        comparison: {
          previousFrom: previous.previousFrom.toISOString(),
          previousTo: previous.previousTo.toISOString(),
          amount: previousAmount,
          deltaPct: deltaPct(
            roundMoney(trend.reduce((sum, point) => sum + point.amount, 0)),
            previousAmount,
          ),
        },
      },
      byCategory,
      byPaymentMethod: [...methodTotals.entries()].map(([method, bucket]) => ({
        method,
        amount: roundMoney(bucket.amount),
        count: bucket.count,
      })),
      recent: await this.serializeExpenses(
        rangeExpenses.slice(0, 8) as Array<Record<string, unknown>>,
      ),
    };
  }

  async getReports(
    studioId: string,
    opts: { from?: string; to?: string } = {},
  ) {
    await this.ensureDefaultCategories(studioId);
    const now = new Date();
    const from = opts.from
      ? parseDate(opts.from, "from")
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
    const to = opts.to ? new Date(`${opts.to}T23:59:59.999Z`) : now;
    const range = normalizeRange(from, to);

    const expenses = await this.prisma.expense.findMany({
      where: { studioId, archivedAt: null },
      include: { category: { select: { id: true, name: true, icon: true } } },
      orderBy: { expenseDate: "desc" },
    });

    const mapped = expenses.map((expense) => ({
      expenseDate: expense.expenseDate,
      amount: expense.amount,
      categoryId: expense.categoryId,
      categoryName: expense.category.name,
      vendor: expense.vendor,
    }));

    return {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      totals: periodTotals({
        expenses: mapped,
        from: range.from,
        to: range.to,
      }),
      monthly: buildMonthlyReport({
        expenses: mapped,
        from: range.from,
        to: range.to,
      }),
      byCategory: buildCategoryReport({
        expenses: mapped,
        from: range.from,
        to: range.to,
      }),
      byVendor: buildVendorReport({
        expenses: mapped,
        from: range.from,
        to: range.to,
      }),
    };
  }

  async getFinancialOverview(
    studioId: string,
    opts: { from?: string; to?: string } = {},
  ) {
    await this.ensureDefaultCategories(studioId);
    const now = new Date();
    const from = opts.from
      ? parseDate(opts.from, "from")
      : new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const to = opts.to ? new Date(`${opts.to}T23:59:59.999Z`) : now;
    const range = normalizeRange(from, to);

    const invoices = await this.billingService.listByStudio(studioId);
    let revenue = 0;
    let refunds = 0;
    for (const invoice of invoices) {
      if (invoice.status !== "PAID" || !invoice.paidAt) {
        continue;
      }
      if (invoice.paidAt < range.from || invoice.paidAt > range.to) {
        continue;
      }
      revenue +=
        invoice.amount -
        invoice.referralDiscount -
        invoice.studioDiscount -
        invoice.familyDiscount;
      refunds += invoice.refundedAmount;
    }
    revenue = roundMoney(Math.max(0, revenue - refunds));

    const expenses = await this.prisma.expense.findMany({
      where: { studioId, archivedAt: null },
      select: { amount: true, expenseDate: true },
    });
    const expenseTotal = periodTotals({
      expenses: expenses as unknown as Array<{
        expenseDate: Date;
        amount: unknown;
      }>,
      from: range.from,
      to: range.to,
    }).amount;

    return {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      revenue,
      expenses: expenseTotal,
      net: roundMoney(revenue - expenseTotal),
    };
  }

  async listRecurringExpenses(studioId: string) {
    await this.ensureDefaultCategories(studioId);
    const items = await this.prisma.recurringExpense.findMany({
      where: { studioId, archivedAt: null },
      include: { category: { select: { id: true, name: true, icon: true } } },
      orderBy: [{ active: "desc" }, { nextOccurrence: "asc" }],
    });
    return items.map((item) => ({ ...item, amount: Number(item.amount) }));
  }

  async createRecurringExpense(
    actorId: string,
    actorStudioId: string,
    input: CreateRecurringExpenseInput,
  ) {
    if (input.studioId !== actorStudioId) {
      throw new ForbiddenException(
        "Recurring expenses can only be created for your studio",
      );
    }
    if (input.amount <= 0) {
      throw new BadRequestException("Amount must be greater than 0");
    }
    const startDate = parseDate(input.startDate, "startDate");
    await this.assertCategoryInStudio(input.categoryId, input.studioId);
    let endDate: Date | null = null;
    if (input.endDate) {
      endDate = parseDate(input.endDate, "endDate");
      if (endDate < startDate) {
        throw new BadRequestException("endDate cannot be before startDate");
      }
    }
    return this.prisma.recurringExpense.create({
      data: {
        studioId: input.studioId,
        categoryId: input.categoryId,
        amount: roundMoney(input.amount),
        frequency: input.frequency as ExpenseRecurrenceFrequency,
        startDate,
        endDate,
        nextOccurrence: startDate,
        vendor: input.vendor?.trim() || null,
        paymentMethod: input.paymentMethod as ExpensePaymentMethod,
        description: input.description?.trim() || null,
        notes: input.notes?.trim() || null,
        createdById: actorId,
      },
    });
  }

  async updateRecurringExpense(
    actorId: string,
    id: string,
    studioId: string,
    input: UpdateRecurringExpenseInput,
  ) {
    await this.assertRecurringInStudio(id, studioId);
    if (input.amount !== undefined && input.amount <= 0) {
      throw new BadRequestException("Amount must be greater than 0");
    }
    if (input.categoryId !== undefined) {
      await this.assertCategoryInStudio(input.categoryId, studioId);
    }
    const data: Prisma.RecurringExpenseUncheckedUpdateInput = {
      updatedById: actorId,
    };
    if (input.amount !== undefined) {
      data.amount = roundMoney(input.amount);
    }
    if (input.frequency !== undefined) {
      data.frequency = input.frequency as ExpenseRecurrenceFrequency;
    }
    if (input.startDate !== undefined) {
      data.startDate = parseDate(input.startDate, "startDate");
    }
    if (input.endDate !== undefined) {
      data.endDate = input.endDate ? parseDate(input.endDate, "endDate") : null;
    }
    if (input.vendor !== undefined) {
      data.vendor = input.vendor?.trim() || null;
    }
    if (input.paymentMethod !== undefined) {
      data.paymentMethod = input.paymentMethod as ExpensePaymentMethod;
    }
    if (input.description !== undefined) {
      data.description = input.description?.trim() || null;
    }
    if (input.notes !== undefined) {
      data.notes = input.notes?.trim() || null;
    }
    return this.prisma.recurringExpense.update({ where: { id }, data });
  }

  async deleteRecurringExpense(
    id: string,
    studioId: string,
  ): Promise<{ id: string }> {
    await this.assertRecurringInStudio(id, studioId);
    await this.prisma.recurringExpense.update({
      where: { id },
      data: { archivedAt: new Date(), active: false },
    });
    return { id };
  }

  /**
   * Idempotently materialize due occurrences of recurring expenses.
   * Each occurrence is created exactly once — `nextOccurrence` is advanced
   * after each creation, so re-running never duplicates expenses.
   */
  async materializeDueRecurringExpenses(
    studioId: string,
    actorId: string,
    today = new Date(),
  ): Promise<{ created: number }> {
    const due = await this.prisma.recurringExpense.findMany({
      where: {
        studioId,
        archivedAt: null,
        active: true,
        nextOccurrence: { lte: today },
      },
    });

    let created = 0;
    for (const recurring of due) {
      let cursor = recurring.nextOccurrence;
      while (cursor.getTime() <= today.getTime()) {
        if (
          recurring.endDate &&
          cursor.getTime() > recurring.endDate.getTime()
        ) {
          break;
        }
        await this.prisma.expense.create({
          data: {
            studioId: recurring.studioId,
            categoryId: recurring.categoryId,
            amount: recurring.amount,
            expenseDate: cursor,
            vendor: recurring.vendor,
            paymentMethod: recurring.paymentMethod,
            description: recurring.description,
            notes: recurring.notes,
            recurringExpenseId: recurring.id,
            createdById: actorId,
          },
        });
        created += 1;
        cursor = computeNextOccurrence(cursor, recurring.frequency);
      }
      const ended =
        recurring.endDate != null &&
        cursor.getTime() > recurring.endDate.getTime();
      await this.prisma.recurringExpense.update({
        where: { id: recurring.id },
        data: { nextOccurrence: cursor, ...(ended ? { active: false } : {}) },
      });
    }
    return { created };
  }
}
