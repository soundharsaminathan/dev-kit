import {
  BatchCategory,
  BillingCadence,
  FamilyPack,
  IndividualAudience,
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

export function computePlatformFee(
  amount: number,
  platformFeePercent: number,
): number {
  return Math.round(amount * (platformFeePercent / 100) * 100) / 100;
}
