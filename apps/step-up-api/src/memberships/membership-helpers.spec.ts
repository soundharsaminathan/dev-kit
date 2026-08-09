import {
  AgeRange,
  BatchCategory,
  BillingCadence,
  FamilyPack,
  IndividualAudience,
  InvoiceStatus,
  MembershipSeatRole,
  MembershipStatus,
  SubscriptionKind,
} from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  batchCategoryForAgeRange,
  computePlatformFee,
  getNextPeriodStart,
  getPeriodEnd,
  isMonthlyPlanUnpaid,
  membershipCoversBatch,
  seatsForCatalog,
  seatsForFamilyPack,
} from "./membership-helpers";

describe("membership-helpers", () => {
  it("computes seats for family packs", () => {
    expect(seatsForFamilyPack(FamilyPack.TWO_KIDS)).toEqual({
      adultSeats: 0,
      kidSeats: 2,
    });
    expect(seatsForFamilyPack(FamilyPack.TWO_ADULTS_TWO_KIDS)).toEqual({
      adultSeats: 2,
      kidSeats: 2,
    });
  });

  it("computes seats for catalog kinds", () => {
    expect(
      seatsForCatalog({
        kind: SubscriptionKind.INDIVIDUAL,
        individualAudience: IndividualAudience.ADULT,
      }),
    ).toEqual({ adultSeats: 1, kidSeats: 0 });
    expect(
      seatsForCatalog({
        kind: SubscriptionKind.FAMILY,
        familyPack: FamilyPack.ONE_ADULT_ONE_KID,
      }),
    ).toEqual({ adultSeats: 1, kidSeats: 1 });
  });

  it("computes monthly and quarterly period ends", () => {
    const start = new Date(Date.UTC(2026, 6, 1));
    expect(getPeriodEnd(start, BillingCadence.MONTHLY).toISOString()).toBe(
      "2026-07-31T23:59:59.999Z",
    );
    expect(getPeriodEnd(start, BillingCadence.QUARTERLY).toISOString()).toBe(
      "2026-09-30T23:59:59.999Z",
    );
  });

  it("advances to next period start", () => {
    expect(
      getNextPeriodStart(new Date(Date.UTC(2026, 6, 1))).toISOString(),
    ).toBe("2026-07-01T00:00:00.000Z");
    expect(
      getNextPeriodStart(new Date(Date.UTC(2026, 6, 15))).toISOString(),
    ).toBe("2026-08-01T00:00:00.000Z");
  });

  it("covers batch by seat role", () => {
    const base = {
      status: MembershipStatus.ACTIVE,
      periodStart: new Date(Date.UTC(2026, 6, 1)),
      periodEnd: new Date(Date.UTC(2026, 6, 31, 23, 59, 59, 999)),
      at: new Date(Date.UTC(2026, 6, 10)),
    };
    expect(
      membershipCoversBatch({
        ...base,
        seatRole: MembershipSeatRole.KID,
        batchCategory: BatchCategory.KIDS,
      }),
    ).toBe(true);
    expect(
      membershipCoversBatch({
        ...base,
        seatRole: MembershipSeatRole.KID,
        batchCategory: BatchCategory.ADULTS,
      }),
    ).toBe(false);
  });

  it("maps age range to batch category", () => {
    expect(batchCategoryForAgeRange(null)).toBeNull();
    expect(batchCategoryForAgeRange(undefined)).toBeNull();
    expect(batchCategoryForAgeRange(AgeRange.UNDER_10)).toBe(
      BatchCategory.KIDS,
    );
    expect(batchCategoryForAgeRange(AgeRange.TEN_TO_TWENTY)).toBe(
      BatchCategory.KIDS,
    );
    expect(batchCategoryForAgeRange(AgeRange.TWENTY_TO_FORTY)).toBe(
      BatchCategory.ADULTS,
    );
    expect(batchCategoryForAgeRange(AgeRange.FORTY_PLUS)).toBe(
      BatchCategory.ADULTS,
    );
  });

  it("computes platform fee", () => {
    expect(computePlatformFee(1000, 5)).toBe(50);
  });

  it("flags unpaid monthly plans", () => {
    expect(
      isMonthlyPlanUnpaid({
        billingCadence: BillingCadence.QUARTERLY,
        membershipStatus: MembershipStatus.DUE,
        invoiceStatuses: [],
      }),
    ).toBe(false);

    expect(
      isMonthlyPlanUnpaid({
        billingCadence: BillingCadence.MONTHLY,
        membershipStatus: MembershipStatus.ACTIVE,
        invoiceStatuses: [InvoiceStatus.PAID],
      }),
    ).toBe(false);

    expect(
      isMonthlyPlanUnpaid({
        billingCadence: BillingCadence.MONTHLY,
        membershipStatus: MembershipStatus.DUE,
        invoiceStatuses: [],
      }),
    ).toBe(true);

    expect(
      isMonthlyPlanUnpaid({
        billingCadence: BillingCadence.MONTHLY,
        membershipStatus: MembershipStatus.ACTIVE,
        invoiceStatuses: [InvoiceStatus.PENDING],
      }),
    ).toBe(true);

    expect(
      isMonthlyPlanUnpaid({
        billingCadence: BillingCadence.MONTHLY,
        membershipStatus: MembershipStatus.ACTIVE,
        invoiceStatuses: [InvoiceStatus.OVERDUE],
      }),
    ).toBe(true);
  });
});
