export type AnalyticsBucket = "day" | "week" | "month";

const DATE_ONLY_PREFIX = /^(\d{4}-\d{2}-\d{2})/;

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function parseExpenseDate(value: string): Date | null {
  const match = DATE_ONLY_PREFIX.exec(value.trim());
  if (!match) {
    return null;
  }
  const date = new Date(`${match[1]}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

export function endOfExpenseDate(value: string): Date | null {
  const start = parseExpenseDate(value);
  if (!start) {
    return null;
  }
  return new Date(
    Date.UTC(
      start.getUTCFullYear(),
      start.getUTCMonth(),
      start.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
}

export function startOfBucket(date: Date, bucket: AnalyticsBucket): Date {
  if (bucket === "day") {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }
  if (bucket === "week") {
    const day = date.getUTCDay();
    const diff = (day + 6) % 7;
    return new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate() - diff,
      ),
    );
  }
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function endOfBucket(start: Date, bucket: AnalyticsBucket): Date {
  if (bucket === "day") {
    return new Date(
      Date.UTC(
        start.getUTCFullYear(),
        start.getUTCMonth(),
        start.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );
  }
  if (bucket === "week") {
    return new Date(
      Date.UTC(
        start.getUTCFullYear(),
        start.getUTCMonth(),
        start.getUTCDate() + 6,
        23,
        59,
        59,
        999,
      ),
    );
  }
  return new Date(
    Date.UTC(
      start.getUTCFullYear(),
      start.getUTCMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    ),
  );
}

export function nextBucketStart(start: Date, bucket: AnalyticsBucket): Date {
  if (bucket === "day") {
    return new Date(
      Date.UTC(
        start.getUTCFullYear(),
        start.getUTCMonth(),
        start.getUTCDate() + 1,
      ),
    );
  }
  if (bucket === "week") {
    return new Date(
      Date.UTC(
        start.getUTCFullYear(),
        start.getUTCMonth(),
        start.getUTCDate() + 7,
      ),
    );
  }
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
}

export function inferBucket(from: Date, to: Date): AnalyticsBucket {
  const days = (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000);
  if (days <= 45) {
    return "day";
  }
  if (days <= 120) {
    return "week";
  }
  return "month";
}

export type ExpenseSeriesPoint = {
  start: string;
  end: string;
  amount: number;
  count: number;
};

export function buildExpenseSeries(input: {
  expenses: Array<{ expenseDate: Date; amount: unknown }>;
  from: Date;
  to: Date;
  bucket: AnalyticsBucket;
}): ExpenseSeriesPoint[] {
  const points: ExpenseSeriesPoint[] = [];
  let cursor = startOfBucket(input.from, input.bucket);

  while (cursor.getTime() <= input.to.getTime()) {
    const bucketEnd = endOfBucket(cursor, input.bucket);
    let amount = 0;
    let count = 0;
    for (const expense of input.expenses) {
      if (expense.expenseDate >= cursor && expense.expenseDate <= bucketEnd) {
        amount += Number(expense.amount);
        count += 1;
      }
    }
    points.push({
      start: cursor.toISOString(),
      end: bucketEnd.toISOString(),
      amount: roundMoney(amount),
      count,
    });
    cursor = nextBucketStart(cursor, input.bucket);
  }

  return points;
}

export function previousPeriodFor(
  from: Date,
  to: Date,
): { previousFrom: Date; previousTo: Date } {
  const duration = to.getTime() - from.getTime();
  return {
    previousFrom: new Date(from.getTime() - duration),
    previousTo: new Date(from.getTime() - 1),
  };
}

export function periodTotals(input: {
  expenses: Array<{ expenseDate: Date; amount: unknown }>;
  from: Date;
  to: Date;
}): { amount: number; count: number } {
  let amount = 0;
  let count = 0;
  for (const expense of input.expenses) {
    if (expense.expenseDate >= input.from && expense.expenseDate <= input.to) {
      amount += Number(expense.amount);
      count += 1;
    }
  }
  return { amount: roundMoney(amount), count };
}

export function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) {
    return null;
  }
  return roundMoney(((current - previous) / previous) * 100);
}

export function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function monthsBetween(from: Date, to: Date): string[] {
  const keys: string[] = [];
  let cursor = startOfMonth(from);
  const end = startOfMonth(to);
  while (cursor.getTime() <= end.getTime()) {
    keys.push(monthKey(cursor));
    cursor = new Date(
      Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1),
    );
  }
  return keys;
}

export type MonthlyReportRow = {
  month: string;
  total: number;
  count: number;
};

export function buildMonthlyReport(input: {
  expenses: Array<{ expenseDate: Date; amount: unknown }>;
  from: Date;
  to: Date;
}): MonthlyReportRow[] {
  const buckets = new Map<string, { total: number; count: number }>();
  for (const key of monthsBetween(input.from, input.to)) {
    buckets.set(key, { total: 0, count: 0 });
  }
  for (const expense of input.expenses) {
    if (expense.expenseDate < input.from || expense.expenseDate > input.to) {
      continue;
    }
    const key = monthKey(expense.expenseDate);
    const bucket = buckets.get(key);
    if (!bucket) {
      continue;
    }
    bucket.total += Number(expense.amount);
    bucket.count += 1;
  }
  return [...buckets.entries()].map(([month, bucket]) => ({
    month,
    total: roundMoney(bucket.total),
    count: bucket.count,
  }));
}

export type CategoryReportRow = {
  categoryId: string;
  categoryName: string;
  total: number;
  percentage: number;
  count: number;
  average: number;
};

export function buildCategoryReport(input: {
  expenses: Array<{
    expenseDate: Date;
    amount: unknown;
    categoryId: string;
    categoryName: string;
  }>;
  from: Date;
  to: Date;
}): CategoryReportRow[] {
  const buckets = new Map<
    string,
    { name: string; total: number; count: number }
  >();
  let grandTotal = 0;
  for (const expense of input.expenses) {
    if (expense.expenseDate < input.from || expense.expenseDate > input.to) {
      continue;
    }
    const amount = Number(expense.amount);
    grandTotal += amount;
    const bucket = buckets.get(expense.categoryId) ?? {
      name: expense.categoryName,
      total: 0,
      count: 0,
    };
    bucket.name = expense.categoryName;
    bucket.total += amount;
    bucket.count += 1;
    buckets.set(expense.categoryId, bucket);
  }
  const rows = [...buckets.entries()].map(([categoryId, bucket]) => ({
    categoryId,
    categoryName: bucket.name,
    total: roundMoney(bucket.total),
    percentage:
      grandTotal > 0 ? roundMoney((bucket.total / grandTotal) * 100) : 0,
    count: bucket.count,
    average: bucket.count > 0 ? roundMoney(bucket.total / bucket.count) : 0,
  }));
  return rows.sort((a, b) => b.total - a.total);
}

export type VendorReportRow = {
  vendor: string;
  total: number;
  count: number;
  average: number;
};

export function buildVendorReport(input: {
  expenses: Array<{
    expenseDate: Date;
    amount: unknown;
    vendor: string | null;
  }>;
  from: Date;
  to: Date;
}): VendorReportRow[] {
  const buckets = new Map<string, { total: number; count: number }>();
  for (const expense of input.expenses) {
    if (expense.expenseDate < input.from || expense.expenseDate > input.to) {
      continue;
    }
    const vendor = expense.vendor?.trim() || "Unspecified";
    const bucket = buckets.get(vendor) ?? { total: 0, count: 0 };
    bucket.total += Number(expense.amount);
    bucket.count += 1;
    buckets.set(vendor, bucket);
  }
  const rows = [...buckets.entries()].map(([vendor, bucket]) => ({
    vendor,
    total: roundMoney(bucket.total),
    count: bucket.count,
    average: bucket.count > 0 ? roundMoney(bucket.total / bucket.count) : 0,
  }));
  return rows.sort((a, b) => b.total - a.total);
}

export const RECURRENCE_MONTHS: Record<string, number> = {
  DAILY: 0,
  WEEKLY: 0,
  MONTHLY: 1,
  QUARTERLY: 3,
  YEARLY: 12,
};

export function addMonthsUtc(date: Date, months: number): Date {
  const year =
    date.getUTCFullYear() + Math.floor((date.getUTCMonth() + months) / 12);
  const month = (((date.getUTCMonth() + months) % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(date.getUTCDate(), lastDay);
  return new Date(Date.UTC(year, month, day));
}

export function addDaysUtc(date: Date, days: number): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() + days,
    ),
  );
}

export function addWeeksUtc(date: Date, weeks: number): Date {
  return addDaysUtc(date, weeks * 7);
}

export function computeNextOccurrence(date: Date, frequency: string): Date {
  if (frequency === "DAILY") {
    return addDaysUtc(date, 1);
  }
  if (frequency === "WEEKLY") {
    return addWeeksUtc(date, 1);
  }
  if (frequency === "QUARTERLY") {
    return addMonthsUtc(date, 3);
  }
  if (frequency === "YEARLY") {
    return addMonthsUtc(date, 12);
  }
  return addMonthsUtc(date, 1);
}
