import { BillingCadence, InvoiceStatus } from "@prisma/client";
import { getPeriodEnd, utcMonthStart } from "../memberships/membership-helpers";

export type GapEnrollmentInput = {
  studentId: string;
  batchId: string;
  enrolledAt: Date;
  endedAt: Date | null;
  planCadence: BillingCadence;
  planPrice: number;
  subscriptionId: string;
};

export type GapPaidInvoiceInput = {
  studentId: string;
  batchId: string;
  paidAt: Date;
  cadence: BillingCadence;
};

/** Existing invoice period starts (paid or unpaid) to keep import idempotent. */
export type GapExistingPeriodInput = {
  studentId: string;
  batchId: string;
  /** UTC month-start of the billing period this invoice represents. */
  periodStart: Date;
};

export type GapInvoiceDraft = {
  studentId: string;
  batchId: string;
  subscriptionId: string;
  amount: number;
  status: typeof InvoiceStatus.OVERDUE | typeof InvoiceStatus.PENDING;
  periodStart: Date;
  periodEnd: Date;
};

function monthKey(at: Date): string {
  return `${at.getUTCFullYear()}-${String(at.getUTCMonth() + 1).padStart(2, "0")}`;
}

function addUtcMonths(at: Date, months: number): Date {
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + months, 1));
}

function cadenceMonths(cadence: BillingCadence): number {
  return cadence === BillingCadence.QUARTERLY ? 3 : 1;
}

function windowEndMonth(enrollment: GapEnrollmentInput, now: Date): Date {
  if (enrollment.endedAt) {
    const ended = utcMonthStart(enrollment.endedAt);
    const today = utcMonthStart(now);
    return ended.getTime() < today.getTime() ? ended : today;
  }
  return utcMonthStart(now);
}

/** Months covered by a paid invoice starting at paidAt for its cadence. */
export function coveredMonthKeys(
  paidAt: Date,
  cadence: BillingCadence,
): string[] {
  const start = utcMonthStart(paidAt);
  const months = cadenceMonths(cadence);
  const keys: string[] = [];
  for (let i = 0; i < months; i += 1) {
    keys.push(monthKey(addUtcMonths(start, i)));
  }
  return keys;
}

function periodMonthKeys(periodStart: Date, cadence: BillingCadence): string[] {
  const months = cadenceMonths(cadence);
  const keys: string[] = [];
  for (let i = 0; i < months; i += 1) {
    keys.push(monthKey(addUtcMonths(periodStart, i)));
  }
  return keys;
}

function expectedPeriodStarts(
  enrollStart: Date,
  windowEnd: Date,
  cadence: BillingCadence,
): Date[] {
  const step = cadenceMonths(cadence);
  const starts: Date[] = [];
  let cursor = enrollStart;
  while (cursor.getTime() <= windowEnd.getTime()) {
    starts.push(cursor);
    cursor = addUtcMonths(cursor, step);
  }
  return starts;
}

/**
 * Build unpaid invoices for enrollment periods not covered by paid invoices.
 * Quarterly payments cover 3 months; monthly enrollment still skips those months.
 */
export function buildImportGapInvoices(args: {
  enrollments: GapEnrollmentInput[];
  paidInvoices: GapPaidInvoiceInput[];
  existingPeriods?: GapExistingPeriodInput[];
  now?: Date;
}): GapInvoiceDraft[] {
  const now = args.now ?? new Date();
  const currentMonth = utcMonthStart(now);

  const coveredByPair = new Map<string, Set<string>>();
  for (const paid of args.paidInvoices) {
    const pair = `${paid.studentId}:${paid.batchId}`;
    const set = coveredByPair.get(pair) ?? new Set<string>();
    for (const key of coveredMonthKeys(paid.paidAt, paid.cadence)) {
      set.add(key);
    }
    coveredByPair.set(pair, set);
  }

  const existingByPair = new Map<string, Set<string>>();
  for (const row of args.existingPeriods ?? []) {
    const pair = `${row.studentId}:${row.batchId}`;
    const set = existingByPair.get(pair) ?? new Set<string>();
    set.add(monthKey(utcMonthStart(row.periodStart)));
    existingByPair.set(pair, set);
  }

  const gaps: GapInvoiceDraft[] = [];

  for (const enrollment of args.enrollments) {
    const enrollStart = utcMonthStart(enrollment.enrolledAt);
    const endMonth = windowEndMonth(enrollment, now);
    if (endMonth.getTime() < enrollStart.getTime()) {
      continue;
    }

    const pair = `${enrollment.studentId}:${enrollment.batchId}`;
    const covered = coveredByPair.get(pair) ?? new Set<string>();
    const existing = existingByPair.get(pair) ?? new Set<string>();

    for (const periodStart of expectedPeriodStarts(
      enrollStart,
      endMonth,
      enrollment.planCadence,
    )) {
      const periodKeys = periodMonthKeys(periodStart, enrollment.planCadence);
      // Only require coverage for months that fall inside the enrollment window.
      const windowKeys = periodKeys.filter((key) => {
        const [y, m] = key.split("-").map(Number);
        const month = new Date(Date.UTC(y!, m! - 1, 1));
        return (
          month.getTime() >= enrollStart.getTime() &&
          month.getTime() <= endMonth.getTime()
        );
      });
      if (windowKeys.length === 0) {
        continue;
      }
      const fullyCovered = windowKeys.every((key) => covered.has(key));
      if (fullyCovered) {
        continue;
      }

      const periodKey = monthKey(periodStart);
      if (existing.has(periodKey)) {
        continue;
      }

      // Skip expected periods that start after the window end (safety).
      if (periodStart.getTime() > endMonth.getTime()) {
        continue;
      }

      const periodEnd = getPeriodEnd(periodStart, enrollment.planCadence);
      const isCurrent =
        periodStart.getUTCFullYear() === currentMonth.getUTCFullYear() &&
        periodStart.getUTCMonth() === currentMonth.getUTCMonth();

      gaps.push({
        studentId: enrollment.studentId,
        batchId: enrollment.batchId,
        subscriptionId: enrollment.subscriptionId,
        amount: enrollment.planPrice,
        status: isCurrent ? InvoiceStatus.PENDING : InvoiceStatus.OVERDUE,
        periodStart,
        periodEnd,
      });

      existing.add(periodKey);
    }
  }

  return gaps;
}
