import { daysBetween, round2 } from "./emi";

/** Q46 Actual/365 broken-period interest on remaining principal. */
export function accruedInterestToDate(input: {
  principalOutstanding: number;
  annualRatePercent: number;
  fromDate: Date;
  asOfDate: Date;
}): number {
  const days = daysBetween(input.fromDate, input.asOfDate);
  if (days <= 0 || input.principalOutstanding <= 0) return 0;
  return round2(
    (input.principalOutstanding * input.annualRatePercent * days) / (100 * 365),
  );
}
