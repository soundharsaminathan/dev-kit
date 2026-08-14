import {
  AgeRange,
  BatchCategory,
  BillingCadence,
  FamilyPack,
  IndividualAudience,
  InvoiceChargeType,
  InvoiceStatus,
  MembershipBillingPhase,
  MembershipSeatRole,
  MembershipStatus,
  SubscriptionKind,
} from "@prisma/client";

export type CatalogSeatInput = {
  kind: SubscriptionKind;
  individualAudience?: IndividualAudience | null;
  familyPack?: FamilyPack | null;
};

export function seatsForFamilyPack(pack: FamilyPack): {
  adultSeats: number;
  kidSeats: number;
} {
  switch (pack) {
    case FamilyPack.TWO_KIDS:
      return { adultSeats: 0, kidSeats: 2 };
    case FamilyPack.ONE_ADULT_ONE_KID:
      return { adultSeats: 1, kidSeats: 1 };
    case FamilyPack.TWO_ADULTS:
      return { adultSeats: 2, kidSeats: 0 };
    case FamilyPack.ONE_ADULT_TWO_KIDS:
      return { adultSeats: 1, kidSeats: 2 };
    case FamilyPack.TWO_ADULTS_ONE_KID:
      return { adultSeats: 2, kidSeats: 1 };
    case FamilyPack.TWO_ADULTS_TWO_KIDS:
      return { adultSeats: 2, kidSeats: 2 };
    default:
      return { adultSeats: 0, kidSeats: 0 };
  }
}

export function seatsForCatalog(input: CatalogSeatInput): {
  adultSeats: number;
  kidSeats: number;
} {
  if (input.kind === SubscriptionKind.INDIVIDUAL) {
    if (input.individualAudience === IndividualAudience.ADULT) {
      return { adultSeats: 1, kidSeats: 0 };
    }
    return { adultSeats: 0, kidSeats: 1 };
  }
  if (!input.familyPack) {
    return { adultSeats: 0, kidSeats: 0 };
  }
  return seatsForFamilyPack(input.familyPack);
}

export function getNextPeriodStart(fromDate: Date = new Date()): Date {
  const year = fromDate.getUTCFullYear();
  const month = fromDate.getUTCMonth();
  const day = fromDate.getUTCDate();

  if (day === 1) {
    return new Date(Date.UTC(year, month, 1));
  }

  return new Date(Date.UTC(year, month + 1, 1));
}

export function getPeriodEnd(
  periodStart: Date,
  cadence: BillingCadence = BillingCadence.MONTHLY,
): Date {
  const year = periodStart.getUTCFullYear();
  const month = periodStart.getUTCMonth();
  const months = cadence === BillingCadence.QUARTERLY ? 3 : 1;
  return new Date(Date.UTC(year, month + months, 0, 23, 59, 59, 999));
}

export function seatRoleForBatchCategory(
  category: BatchCategory,
): MembershipSeatRole {
  return category === BatchCategory.KIDS
    ? MembershipSeatRole.KID
    : MembershipSeatRole.ADULT;
}

/** Maps a student's age range to the batch audience they belong in. */
export function batchCategoryForAgeRange(
  ageRange: AgeRange | null | undefined,
): BatchCategory | null {
  if (!ageRange) return null;
  if (ageRange === AgeRange.UNDER_10 || ageRange === AgeRange.TEN_TO_TWENTY) {
    return BatchCategory.KIDS;
  }
  return BatchCategory.ADULTS;
}

export function membershipCoversBatch(args: {
  status: MembershipStatus;
  periodStart: Date;
  periodEnd: Date;
  seatRole: MembershipSeatRole;
  batchCategory: BatchCategory;
  at?: Date;
}): boolean {
  const at = args.at ?? new Date();
  if (args.status !== MembershipStatus.ACTIVE) {
    return false;
  }
  if (at < args.periodStart || at > args.periodEnd) {
    return false;
  }
  return args.seatRole === seatRoleForBatchCategory(args.batchCategory);
}

export function computePercentAmount(amount: number, percent: number): number {
  return Math.round(amount * (percent / 100) * 100) / 100;
}

export function computePlatformFee(
  amount: number,
  platformFeePercent: number,
): number {
  return computePercentAmount(amount, platformFeePercent);
}

export function computeGst(amount: number, gstPercent: number): number {
  return computePercentAmount(amount, gstPercent);
}

export const DEFAULT_PLATFORM_FEE_PERCENT = 5;
export const DEFAULT_GST_PERCENT = 0;

export function invoiceFeePercents(
  settings:
    | {
        platformFeePercent?: number | null;
        gstPercent?: number | null;
      }
    | null
    | undefined,
) {
  return {
    platformFeePercent:
      settings?.platformFeePercent ?? DEFAULT_PLATFORM_FEE_PERCENT,
    gstPercent: settings?.gstPercent ?? DEFAULT_GST_PERCENT,
  };
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function utcMonthStart(at: Date = new Date()): Date {
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), 1));
}

export function isUtcFirstOfMonth(at: Date): boolean {
  return at.getUTCDate() === 1;
}

/** Prepaid at join when it is the 1st or they have not missed this batch's first session. */
export function isPrepaidAtJoin(args: {
  joinedAt: Date;
  firstSessionStartsAt: Date | null;
}): boolean {
  if (isUtcFirstOfMonth(args.joinedAt)) {
    return true;
  }
  if (!args.firstSessionStartsAt) {
    return true;
  }
  return args.joinedAt.getTime() <= args.firstSessionStartsAt.getTime();
}

export function prorateByAttendance(
  planPrice: number,
  attended: number,
  billedSessions: number,
): number {
  if (billedSessions <= 0 || attended <= 0) {
    return 0;
  }
  const capped = Math.min(attended, billedSessions);
  return roundMoney(planPrice * (capped / billedSessions));
}

/** First partial month: remaining sessions after join / scheduled sessions that month. */
export function prorateByRemaining(
  planPrice: number,
  remainingSessions: number,
  billedSessions: number,
): number {
  if (billedSessions <= 0 || remainingSessions <= 0) {
    return 0;
  }
  const capped = Math.min(remainingSessions, billedSessions);
  return roundMoney(planPrice * (capped / billedSessions));
}

/** After the 20th (UTC day ≥ 21): create next-month prepaid at enroll. */
export function isAfterUtcDay20(at: Date): boolean {
  return at.getUTCDate() > 20;
}

export function invoiceDueDate(args: {
  chargeType?: InvoiceChargeType | null;
  periodStart?: Date | null;
  periodEnd?: Date | null;
}): Date | null {
  if (args.chargeType === InvoiceChargeType.POSTPAID_PRORATED) {
    return args.periodEnd ?? null;
  }
  return args.periodStart ?? null;
}

export type MonthlyPlanPaymentSnapshot = {
  billingCadence: BillingCadence;
  membershipStatus: MembershipStatus;
  invoiceStatuses: InvoiceStatus[];
  billingPhase?: MembershipBillingPhase;
};

/** Latest monthly membership is unpaid when due/expired or any invoice is open. */
export function isMonthlyPlanUnpaid(
  snapshot: MonthlyPlanPaymentSnapshot,
): boolean {
  if (snapshot.billingCadence !== BillingCadence.MONTHLY) {
    return false;
  }
  if (snapshot.billingPhase === MembershipBillingPhase.FIRST_POSTPAID) {
    return snapshot.invoiceStatuses.some(
      (status) =>
        status === InvoiceStatus.PENDING || status === InvoiceStatus.OVERDUE,
    );
  }
  if (
    snapshot.membershipStatus === MembershipStatus.DUE ||
    snapshot.membershipStatus === MembershipStatus.EXPIRED
  ) {
    return true;
  }
  return snapshot.invoiceStatuses.some(
    (status) =>
      status === InvoiceStatus.PENDING || status === InvoiceStatus.OVERDUE,
  );
}
