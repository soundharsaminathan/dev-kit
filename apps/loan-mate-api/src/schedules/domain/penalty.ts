import { daysBetween, round2 } from "./emi";

/**
 * Penalty: simple daily % of remaining unpaid EMI (principal+interest unpaid),
 * no compounding, no cap. Overdue starts day after due; grace delays accrual only.
 */
export function unpaidEmiAmount(input: {
  principalDue: number;
  interestDue: number;
  paidPrincipal: number;
  paidInterest: number;
}): number {
  const remP = Math.max(0, input.principalDue - input.paidPrincipal);
  const remI = Math.max(0, input.interestDue - input.paidInterest);
  return round2(remP + remI);
}

export function penaltyAccrualDays(input: {
  dueDate: Date;
  asOfDate: Date;
  graceDays: number;
  lastPenaltyDate: Date | null;
}): number {
  const overdueStart = new Date(input.dueDate);
  overdueStart.setDate(overdueStart.getDate() + 1);

  if (input.asOfDate.getTime() < overdueStart.getTime()) {
    return 0;
  }

  // Accrual eligible from max(overdueStart + grace, day after lastPenaltyDate)
  const accrualStart = new Date(overdueStart);
  accrualStart.setDate(accrualStart.getDate() + input.graceDays);

  let from = accrualStart;
  if (input.lastPenaltyDate) {
    const next = new Date(input.lastPenaltyDate);
    next.setDate(next.getDate() + 1);
    if (next.getTime() > from.getTime()) {
      from = next;
    }
  }

  if (input.asOfDate.getTime() < from.getTime()) {
    return 0;
  }

  // Inclusive day count from `from` through `asOfDate`
  return daysBetween(from, input.asOfDate) + 1;
}

export function accruePenalty(input: {
  unpaidEmi: number;
  dailyPercent: number;
  days: number;
}): number {
  if (input.unpaidEmi <= 0 || input.days <= 0 || input.dailyPercent <= 0) {
    return 0;
  }
  return round2((input.unpaidEmi * input.dailyPercent * input.days) / 100);
}

export function computePenaltyDue(input: {
  principalDue: number;
  interestDue: number;
  paidPrincipal: number;
  paidInterest: number;
  currentPenaltyDue: number;
  dueDate: Date;
  asOfDate: Date;
  graceDays: number;
  lastPenaltyDate: Date | null;
  dailyPercent: number;
}): { additionalPenalty: number; newPenaltyDue: number } {
  const unpaid = unpaidEmiAmount(input);
  const days = penaltyAccrualDays(input);
  const additional = accruePenalty({
    unpaidEmi: unpaid,
    dailyPercent: input.dailyPercent,
    days,
  });
  return {
    additionalPenalty: additional,
    newPenaltyDue: round2(input.currentPenaltyDue + additional),
  };
}
