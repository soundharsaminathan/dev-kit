/** Money helpers — work in number (rupees) rounded to 2 dp for schedule math. */

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function daysBetween(a: Date, b: Date): number {
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / 86_400_000);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + days);
  return d;
}

export function clampDayOfMonth(year: number, month: number, day: number): Date {
  const last = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, last));
}

export type PaymentFrequency = "WEEKLY" | "BIWEEKLY" | "MONTHLY";

export type MonthlyFirstEmiOption =
  | "EXACT_DAY"
  | "CONVERT_TO_1ST_PARTIAL"
  | "CONVERT_TO_1ST_NEXT_MONTH";

export interface EmiScheduleInput {
  principal: number;
  annualRatePercent: number;
  tenureInstallments: number;
  frequency: PaymentFrequency;
  disbursementDate: Date;
  monthlyFirstEmiOption?: MonthlyFirstEmiOption;
  processingFee?: number;
}

export interface ScheduleRow {
  installmentNumber: number;
  dueDate: Date;
  principalDue: number;
  interestDue: number;
  openingBalance: number;
  closingBalance: number;
}

export interface EmiScheduleResult {
  schedule: ScheduleRow[];
  emiAmount: number;
  netDisbursement: number;
  partialInterestDeducted: number;
}

function periodDays(frequency: PaymentFrequency): number {
  if (frequency === "WEEKLY") return 7;
  if (frequency === "BIWEEKLY") return 14;
  return 30; // nominal for EMI formula; actual dates use calendar months
}

function equatedEmi(principal: number, periodicRate: number, n: number): number {
  if (n <= 0) return 0;
  if (periodicRate === 0) return round2(principal / n);
  const factor = (1 + periodicRate) ** n;
  return round2((principal * periodicRate * factor) / (factor - 1));
}

function interestForDays(
  outstanding: number,
  annualRatePercent: number,
  days: number,
): number {
  if (days <= 0 || outstanding <= 0) return 0;
  return round2((outstanding * annualRatePercent * days) / (100 * 365));
}

function firstDueDate(
  disbursementDate: Date,
  frequency: PaymentFrequency,
  option: MonthlyFirstEmiOption,
): { dueDate: Date; partialInterestDays: number } {
  const d = disbursementDate;

  if (frequency === "WEEKLY") {
    return { dueDate: addDays(d, 7), partialInterestDays: 0 };
  }
  if (frequency === "BIWEEKLY") {
    return { dueDate: addDays(d, 14), partialInterestDays: 0 };
  }

  // MONTHLY
  if (option === "EXACT_DAY") {
    const targetDay = d.getDate();
    let year = d.getFullYear();
    let month = d.getMonth();
    // Prefer same month if valid and after disbursement; else next month
    let candidate = clampDayOfMonth(year, month, targetDay);
    if (candidate.getTime() <= d.getTime()) {
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
      candidate = clampDayOfMonth(year, month, targetDay);
    }
    return { dueDate: candidate, partialInterestDays: 0 };
  }

  if (option === "CONVERT_TO_1ST_PARTIAL") {
    let year = d.getFullYear();
    let month = d.getMonth() + 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
    const dueDate = new Date(year, month, 1);
    return {
      dueDate,
      partialInterestDays: daysBetween(d, dueDate),
    };
  }

  // CONVERT_TO_1ST_NEXT_MONTH — ignore partial interest
  let year = d.getFullYear();
  let month = d.getMonth() + 1;
  if (month > 11) {
    month = 0;
    year += 1;
  }
  return { dueDate: new Date(year, month, 1), partialInterestDays: 0 };
}

function nextDueDate(
  previous: Date,
  frequency: PaymentFrequency,
  exactDay?: number,
): Date {
  if (frequency === "WEEKLY") return addDays(previous, 7);
  if (frequency === "BIWEEKLY") return addDays(previous, 14);
  const day = exactDay ?? previous.getDate();
  let year = previous.getFullYear();
  let month = previous.getMonth() + 1;
  if (month > 11) {
    month = 0;
    year += 1;
  }
  return clampDayOfMonth(year, month, day);
}

/**
 * Reducing-balance equated EMI schedule with Actual/365 interest per period.
 * Final installment is adjusted to clear principal + accrued interest.
 */
export function generateSchedule(input: EmiScheduleInput): EmiScheduleResult {
  const {
    principal,
    annualRatePercent,
    tenureInstallments: n,
    frequency,
    disbursementDate,
    monthlyFirstEmiOption = "EXACT_DAY",
    processingFee = 0,
  } = input;

  if (principal <= 0 || n <= 0) {
    throw new Error("principal and tenureInstallments must be positive");
  }

  const { dueDate: firstDue, partialInterestDays } = firstDueDate(
    disbursementDate,
    frequency,
    monthlyFirstEmiOption,
  );

  let workingPrincipal = principal;
  let partialInterestDeducted = 0;
  if (partialInterestDays > 0) {
    partialInterestDeducted = interestForDays(
      principal,
      annualRatePercent,
      partialInterestDays,
    );
    // Option-2: partial interest deducted from release; principal for schedule unchanged
  }

  const pDays = periodDays(frequency);
  const periodicRate = (annualRatePercent * pDays) / (100 * 365);
  const emiAmount = equatedEmi(workingPrincipal, periodicRate, n);

  const schedule: ScheduleRow[] = [];
  let outstanding = workingPrincipal;
  let due = firstDue;
  const exactDay =
    frequency === "MONTHLY" && monthlyFirstEmiOption === "EXACT_DAY"
      ? disbursementDate.getDate()
      : frequency === "MONTHLY"
        ? 1
        : undefined;
  let prevDate = disbursementDate;

  for (let i = 1; i <= n; i++) {
    const days = daysBetween(prevDate, due);
    const interestDue = interestForDays(outstanding, annualRatePercent, days);

    let principalDue: number;
    let interestFinal = interestDue;

    if (i === n) {
      principalDue = round2(outstanding);
      // Final installment clears: interest + remaining principal
    } else {
      principalDue = round2(Math.min(outstanding, Math.max(0, emiAmount - interestDue)));
      // If EMI < interest (rare edge), pay interest only
      if (principalDue <= 0 && outstanding > 0) {
        principalDue = 0;
      }
    }

    const closing = round2(outstanding - principalDue);
    schedule.push({
      installmentNumber: i,
      dueDate: due,
      principalDue,
      interestDue: interestFinal,
      openingBalance: round2(outstanding),
      closingBalance: Math.max(0, closing),
    });

    outstanding = Math.max(0, closing);
    prevDate = due;
    if (i < n) {
      due = nextDueDate(due, frequency, exactDay);
    }
  }

  // Tiny floating residual → fold into last principal
  const last = schedule[schedule.length - 1];
  if (last && last.closingBalance !== 0) {
    last.principalDue = round2(last.principalDue + last.closingBalance);
    last.closingBalance = 0;
  }

  const netDisbursement = round2(
    principal - processingFee - partialInterestDeducted,
  );

  return {
    schedule,
    emiAmount,
    netDisbursement,
    partialInterestDeducted,
  };
}

export function totalOutstandingFromSchedule(
  rows: Array<{
    principalDue: number;
    interestDue: number;
    penaltyDue: number;
    paidPrincipal: number;
    paidInterest: number;
    paidPenalty: number;
  }>,
): number {
  return round2(
    rows.reduce((sum, r) => {
      const remP = r.principalDue - r.paidPrincipal;
      const remI = r.interestDue - r.paidInterest;
      const remPen = r.penaltyDue - r.paidPenalty;
      return sum + Math.max(0, remP) + Math.max(0, remI) + Math.max(0, remPen);
    }, 0),
  );
}
