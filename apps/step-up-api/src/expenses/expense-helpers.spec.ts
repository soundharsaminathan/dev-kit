import { describe, expect, it } from "vitest";
import {
  addDaysUtc,
  addMonthsUtc,
  addWeeksUtc,
  buildCategoryReport,
  buildExpenseSeries,
  buildMonthlyReport,
  buildVendorReport,
  computeNextOccurrence,
  deltaPct,
  type ExpenseSeriesPoint,
  endOfExpenseDate,
  inferBucket,
  monthKey,
  monthsBetween,
  nextBucketStart,
  parseExpenseDate,
  periodTotals,
  previousPeriodFor,
  roundMoney,
  startOfBucket,
} from "./expense-helpers";

describe("roundMoney", () => {
  it("rounds to two decimals", () => {
    expect(roundMoney(10.005)).toBe(10.01);
    expect(roundMoney(10)).toBe(10);
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
  });
});

describe("parseExpenseDate", () => {
  it("parses date-only values as UTC midnight", () => {
    expect(parseExpenseDate("2026-07-15")?.toISOString()).toBe(
      "2026-07-15T00:00:00.000Z",
    );
  });

  it("parses ISO datetimes from the web form without appending a second time", () => {
    expect(parseExpenseDate("2026-07-15T00:00:00.000Z")?.toISOString()).toBe(
      "2026-07-15T00:00:00.000Z",
    );
    expect(parseExpenseDate("2026-07-15T18:30:00.000Z")?.toISOString()).toBe(
      "2026-07-15T00:00:00.000Z",
    );
  });

  it("rejects values that are not dates", () => {
    expect(parseExpenseDate("not-a-date")).toBeNull();
    expect(parseExpenseDate("")).toBeNull();
  });

  it("builds an inclusive end-of-day bound from date-only or ISO values", () => {
    expect(endOfExpenseDate("2026-07-31")?.toISOString()).toBe(
      "2026-07-31T23:59:59.999Z",
    );
    expect(endOfExpenseDate("2026-07-31T00:00:00.000Z")?.toISOString()).toBe(
      "2026-07-31T23:59:59.999Z",
    );
  });
});

describe("startOfBucket / nextBucketStart", () => {
  it("returns UTC start of day", () => {
    const date = new Date("2026-07-15T14:30:00.000Z");
    expect(startOfBucket(date, "day").toISOString()).toBe(
      "2026-07-15T00:00:00.000Z",
    );
    expect(
      nextBucketStart(startOfBucket(date, "day"), "day").toISOString(),
    ).toBe("2026-07-16T00:00:00.000Z");
  });

  it("returns Monday as start of week", () => {
    const friday = new Date("2026-07-17T12:00:00.000Z");
    expect(startOfBucket(friday, "week").toISOString()).toBe(
      "2026-07-13T00:00:00.000Z",
    );
    expect(
      nextBucketStart(startOfBucket(friday, "week"), "week").toISOString(),
    ).toBe("2026-07-20T00:00:00.000Z");
  });

  it("returns first of month", () => {
    const date = new Date("2026-07-17T12:00:00.000Z");
    expect(startOfBucket(date, "month").toISOString()).toBe(
      "2026-07-01T00:00:00.000Z",
    );
    expect(
      nextBucketStart(startOfBucket(date, "month"), "month").toISOString(),
    ).toBe("2026-08-01T00:00:00.000Z");
  });
});

describe("inferBucket", () => {
  it("uses day buckets under 45 days", () => {
    expect(inferBucket(new Date("2026-07-01"), new Date("2026-07-30"))).toBe(
      "day",
    );
  });
  it("uses week buckets up to 120 days", () => {
    expect(inferBucket(new Date("2026-06-01"), new Date("2026-08-31"))).toBe(
      "week",
    );
  });
  it("uses month buckets beyond", () => {
    expect(inferBucket(new Date("2026-01-01"), new Date("2026-12-31"))).toBe(
      "month",
    );
  });
});

describe("buildExpenseSeries", () => {
  const expenses = [
    { expenseDate: new Date("2026-07-01T10:00:00Z"), amount: 100 },
    { expenseDate: new Date("2026-07-02T10:00:00Z"), amount: 50.5 },
    { expenseDate: new Date("2026-08-15T10:00:00Z"), amount: 200 },
  ];

  it("buckets by day including empty buckets", () => {
    const series = buildExpenseSeries({
      expenses,
      from: new Date("2026-07-01"),
      to: new Date("2026-07-03"),
      bucket: "day",
    });
    expect(series).toHaveLength(3);
    expect(series[0]).toMatchObject({ amount: 100, count: 1 });
    expect(series[1]).toMatchObject({ amount: 50.5, count: 1 });
    expect(series[2]).toMatchObject({ amount: 0, count: 0 });
  });

  it("buckets by month", () => {
    const series = buildExpenseSeries({
      expenses,
      from: new Date("2026-07-01"),
      to: new Date("2026-08-31"),
      bucket: "month",
    });
    expect(series).toHaveLength(2);
    expect(series[0]).toMatchObject({ amount: 150.5, count: 2 });
    expect(series[1]).toMatchObject({ amount: 200, count: 1 });
  });

  it("ignores expenses outside the range", () => {
    const series = buildExpenseSeries({
      expenses,
      from: new Date("2026-08-01"),
      to: new Date("2026-08-31"),
      bucket: "day",
    });
    const total = series.reduce(
      (sum: number, point: ExpenseSeriesPoint) => sum + point.amount,
      0,
    );
    expect(total).toBe(200);
  });
});

describe("previousPeriodFor", () => {
  it("computes an identical-length window before the range", () => {
    const { previousFrom, previousTo } = previousPeriodFor(
      new Date("2026-08-01"),
      new Date("2026-08-30"),
    );
    expect(previousFrom.toISOString()).toBe("2026-07-03T00:00:00.000Z");
    expect(previousTo.toISOString()).toBe("2026-07-31T23:59:59.999Z");
  });
});

describe("periodTotals", () => {
  it("sums expenses in range", () => {
    const result = periodTotals({
      expenses: [
        { expenseDate: new Date("2026-07-01"), amount: 100 },
        { expenseDate: new Date("2026-07-02"), amount: 0.1 },
        { expenseDate: new Date("2026-08-01"), amount: 999 },
      ],
      from: new Date("2026-07-01"),
      to: new Date("2026-07-31"),
    });
    expect(result.amount).toBe(100.1);
    expect(result.count).toBe(2);
  });
});

describe("deltaPct", () => {
  it("computes percentage change", () => {
    expect(deltaPct(120, 100)).toBe(20);
    expect(deltaPct(80, 100)).toBe(-20);
  });
  it("returns null when previous is zero", () => {
    expect(deltaPct(50, 0)).toBeNull();
  });
});

describe("monthKey / monthsBetween", () => {
  it("formats YYYY-MM", () => {
    expect(monthKey(new Date("2026-07-05"))).toBe("2026-07");
  });
  it("lists months between dates", () => {
    expect(
      monthsBetween(new Date("2026-11-01"), new Date("2027-01-15")),
    ).toEqual(["2026-11", "2026-12", "2027-01"]);
  });
});

describe("buildMonthlyReport", () => {
  it("fills empty months and sums totals", () => {
    const rows = buildMonthlyReport({
      expenses: [
        { expenseDate: new Date("2026-07-01"), amount: 100 },
        { expenseDate: new Date("2026-07-15"), amount: 50 },
        { expenseDate: new Date("2026-09-01"), amount: 25 },
      ],
      from: new Date("2026-07-01"),
      to: new Date("2026-09-30"),
    });
    expect(rows).toEqual([
      { month: "2026-07", total: 150, count: 2 },
      { month: "2026-08", total: 0, count: 0 },
      { month: "2026-09", total: 25, count: 1 },
    ]);
  });
});

describe("buildCategoryReport", () => {
  it("aggregates totals, percentages, count, and average", () => {
    const rows = buildCategoryReport({
      expenses: [
        {
          expenseDate: new Date("2026-07-01"),
          amount: 100,
          categoryId: "rent",
          categoryName: "Rent",
        },
        {
          expenseDate: new Date("2026-07-05"),
          amount: 100,
          categoryId: "rent",
          categoryName: "Rent",
        },
        {
          expenseDate: new Date("2026-07-02"),
          amount: 200,
          categoryId: "mkt",
          categoryName: "Marketing",
        },
      ],
      from: new Date("2026-07-01"),
      to: new Date("2026-07-31"),
    });
    expect(rows[0]).toMatchObject({
      categoryId: "rent",
      categoryName: "Rent",
      total: 200,
      percentage: 50,
      count: 2,
      average: 100,
    });
    expect(rows[1]).toMatchObject({
      categoryId: "mkt",
      total: 200,
      percentage: 50,
      average: 200,
    });
  });
});

describe("buildVendorReport", () => {
  it("aggregates per vendor, using Unspecified for nulls", () => {
    const rows = buildVendorReport({
      expenses: [
        { expenseDate: new Date("2026-07-01"), amount: 100, vendor: "BBMP" },
        { expenseDate: new Date("2026-07-02"), amount: 50, vendor: "BBMP" },
        { expenseDate: new Date("2026-07-03"), amount: 30, vendor: null },
      ],
      from: new Date("2026-07-01"),
      to: new Date("2026-07-31"),
    });
    expect(rows).toEqual([
      { vendor: "BBMP", total: 150, count: 2, average: 75 },
      { vendor: "Unspecified", total: 30, count: 1, average: 30 },
    ]);
  });
});

describe("computeNextOccurrence", () => {
  it("advances monthly by one month preserving day", () => {
    expect(
      computeNextOccurrence(new Date("2026-07-15"), "MONTHLY").toISOString(),
    ).toBe("2026-08-15T00:00:00.000Z");
  });
  it("clamps month-end dates", () => {
    expect(
      computeNextOccurrence(new Date("2026-01-31"), "MONTHLY").toISOString(),
    ).toBe("2026-02-28T00:00:00.000Z");
  });
  it("advances weekly by 7 days", () => {
    expect(
      computeNextOccurrence(new Date("2026-07-15"), "WEEKLY").toISOString(),
    ).toBe("2026-07-22T00:00:00.000Z");
  });
  it("advances daily by 1 day", () => {
    expect(
      computeNextOccurrence(new Date("2026-07-15"), "DAILY").toISOString(),
    ).toBe("2026-07-16T00:00:00.000Z");
  });
  it("advances quarterly and yearly", () => {
    expect(
      computeNextOccurrence(new Date("2026-01-15"), "QUARTERLY").toISOString(),
    ).toBe("2026-04-15T00:00:00.000Z");
    expect(
      computeNextOccurrence(new Date("2026-01-15"), "YEARLY").toISOString(),
    ).toBe("2027-01-15T00:00:00.000Z");
  });
});

describe("addDaysUtc / addWeeksUtc / addMonthsUtc", () => {
  it("handles day and week arithmetic", () => {
    expect(addDaysUtc(new Date("2026-07-15"), 3).toISOString()).toBe(
      "2026-07-18T00:00:00.000Z",
    );
    expect(addWeeksUtc(new Date("2026-07-15"), 1).toISOString()).toBe(
      "2026-07-22T00:00:00.000Z",
    );
  });
  it("handles month arithmetic with clamping", () => {
    expect(addMonthsUtc(new Date("2026-01-31"), 1).toISOString()).toBe(
      "2026-02-28T00:00:00.000Z",
    );
    expect(addMonthsUtc(new Date("2026-12-15"), 2).toISOString()).toBe(
      "2027-02-15T00:00:00.000Z",
    );
  });
});
