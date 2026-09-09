import { BillingCadence } from "@prisma/client";
import { getPeriodEnd, utcMonthStart } from "../memberships/membership-helpers";

export function billingPeriodForCadence(
  at: Date,
  cadence: BillingCadence = BillingCadence.MONTHLY,
): { periodStart: Date; periodEnd: Date } {
  const periodStart = utcMonthStart(at);
  const periodEnd = getPeriodEnd(periodStart, cadence);
  return { periodStart, periodEnd };
}

export function mergeInvoicePeriods(
  invoices: Array<{
    periodStart?: Date | null;
    periodEnd?: Date | null;
  }>,
): { periodStart: Date; periodEnd: Date } {
  const starts = invoices
    .map((invoice) => invoice.periodStart)
    .filter((value): value is Date => value instanceof Date);
  const ends = invoices
    .map((invoice) => invoice.periodEnd)
    .filter((value): value is Date => value instanceof Date);
  if (starts.length === 0) {
    return billingPeriodForCadence(new Date(), BillingCadence.MONTHLY);
  }
  const periodStart = utcMonthStart(
    new Date(Math.min(...starts.map((date) => date.getTime()))),
  );
  const latestEnd =
    ends.length > 0
      ? new Date(Math.max(...ends.map((date) => date.getTime())))
      : getPeriodEnd(periodStart, BillingCadence.MONTHLY);
  return { periodStart, periodEnd: latestEnd };
}

export function coveredMonthKeysFromPeriod(
  periodStart: Date,
  periodEnd?: Date | null,
): string[] {
  const start = utcMonthStart(periodStart);
  let count = 1;
  if (periodEnd) {
    const end = new Date(periodEnd);
    if (!Number.isNaN(end.getTime())) {
      count = Math.min(
        12,
        Math.max(
          1,
          (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
            (end.getUTCMonth() - start.getUTCMonth()) +
            1,
        ),
      );
    }
  }
  return Array.from({ length: count }, (_, offset) => {
    const date = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + offset, 1),
    );
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

function monthDateFromKey(key: string): Date | null {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return null;
  return new Date(Date.UTC(year, month - 1, 1));
}

export function formatInvoicePeriodLabel(
  keys: string[],
  month: "short" | "long" = "short",
): string {
  const dates = keys
    .map((key) => monthDateFromKey(key))
    .filter((date): date is Date => date != null);
  if (dates.length === 0) return "";

  const formatMonthYear = (date: Date) =>
    new Intl.DateTimeFormat("en-IN", {
      month,
      year: "numeric",
      timeZone: "UTC",
    }).format(date);

  if (dates.length === 1) {
    return formatMonthYear(dates[0]!);
  }

  const formatMonth = (date: Date) =>
    new Intl.DateTimeFormat("en-IN", { month, timeZone: "UTC" }).format(date);

  const sameYear = dates.every(
    (date) => date.getUTCFullYear() === dates[0]!.getUTCFullYear(),
  );
  if (sameYear) {
    return `${dates.map(formatMonth).join(", ")} ${dates[0]!.getUTCFullYear()}`;
  }
  return dates.map(formatMonthYear).join(", ");
}

export type InvoicePeriodFields = {
  periodStart: string;
  periodEnd: string;
  billMonthKeys: string[];
  billPeriodLabel: string;
};

/** Stored invoice billing period. Never paidAt, never membership. */
export function presentInvoicePeriod(invoice: {
  periodStart: Date;
  periodEnd: Date;
}): InvoicePeriodFields {
  const billMonthKeys = coveredMonthKeysFromPeriod(
    invoice.periodStart,
    invoice.periodEnd,
  );
  return {
    periodStart: invoice.periodStart.toISOString(),
    periodEnd: invoice.periodEnd.toISOString(),
    billMonthKeys,
    billPeriodLabel: formatInvoicePeriodLabel(billMonthKeys),
  };
}
