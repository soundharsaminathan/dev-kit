import { describe, expect, it } from "vitest";
import {
  activityFromInvoices,
  audienceOrPackLabel,
  durationLabel,
  filterSubscriptions,
  formatPlanPrice,
  isUnused,
  metaLine,
  nextDuplicateName,
  summarizeSubscriptions,
} from "./subscription-model";
import type {
  StudioSubscription,
  SubscriptionQuery,
} from "./subscription-types";

function plan(
  overrides: Partial<StudioSubscription> &
    Pick<StudioSubscription, "id" | "name">,
): StudioSubscription {
  return {
    kind: "INDIVIDUAL",
    individualAudience: "ADULT",
    billingCadence: "MONTHLY",
    price: 1200,
    adultSeats: 1,
    kidSeats: 0,
    active: true,
    membershipCount: 0,
    batchPlanCount: 0,
    canDelete: true,
    ...overrides,
  };
}

const plans: StudioSubscription[] = [
  plan({
    id: "aq",
    name: "Adult Quarterly",
    billingCadence: "QUARTERLY",
    price: 3200,
  }),
  plan({
    id: "am",
    name: "Adults Monthly",
    price: 1200,
  }),
  plan({
    id: "km",
    name: "Kids Monthly",
    individualAudience: "KID",
    price: 2000,
    adultSeats: 0,
    kidSeats: 1,
    membershipCount: 1,
    canDelete: false,
  }),
  plan({
    id: "kq",
    name: "Kids Quarterly",
    individualAudience: "KID",
    billingCadence: "QUARTERLY",
    price: 5000,
    adultSeats: 0,
    kidSeats: 1,
    membershipCount: 1,
    canDelete: false,
  }),
];

const emptyQuery: SubscriptionQuery = {
  cadence: "ALL",
  facets: [],
  search: "",
  sort: "name",
};

describe("subscription model", () => {
  it("summarizes plan, usage, and subscriber counts", () => {
    expect(summarizeSubscriptions(plans)).toEqual({
      totalPlans: 4,
      active: 4,
      unused: 2,
      subscribers: 2,
    });
  });

  it("filters by cadence and audience facets", () => {
    expect(
      filterSubscriptions(plans, { ...emptyQuery, cadence: "MONTHLY" }).map(
        (item) => item.name,
      ),
    ).toEqual(["Adults Monthly", "Kids Monthly"]);

    expect(
      filterSubscriptions(plans, { ...emptyQuery, facets: ["kid"] }).map(
        (item) => item.name,
      ),
    ).toEqual(["Kids Monthly", "Kids Quarterly"]);

    expect(
      filterSubscriptions(plans, { ...emptyQuery, facets: ["unused"] }).map(
        (item) => item.name,
      ),
    ).toEqual(["Adult Quarterly", "Adults Monthly"]);
  });

  it("searches name and metadata and sorts by price", () => {
    expect(
      filterSubscriptions(plans, { ...emptyQuery, search: "qtr" }).map(
        (item) => item.id,
      ),
    ).toEqual(["aq", "kq"]);

    expect(
      filterSubscriptions(plans, { ...emptyQuery, sort: "price-desc" }).map(
        (item) => item.name,
      ),
    ).toEqual([
      "Kids Quarterly",
      "Adult Quarterly",
      "Kids Monthly",
      "Adults Monthly",
    ]);
  });

  it("formats plan labels used on cards", () => {
    const adultQuarterly = plans[0] as StudioSubscription;
    const kidsMonthly = plans[2] as StudioSubscription;
    expect(formatPlanPrice(3200, "QUARTERLY")).toMatch(/3,200/);
    expect(durationLabel("QUARTERLY")).toBe("3 months");
    expect(audienceOrPackLabel(adultQuarterly)).toBe("Adult");
    expect(metaLine(kidsMonthly)).toContain("Kid");
    expect(isUnused(adultQuarterly)).toBe(true);
    expect(isUnused(kidsMonthly)).toBe(false);
  });

  it("picks a unique duplicate name", () => {
    expect(
      nextDuplicateName(
        "Adults Monthly",
        plans.map((item) => item.name),
      ),
    ).toBe("Adults Monthly copy");
    expect(
      nextDuplicateName("Adults Monthly", [
        "Adults Monthly",
        "Adults Monthly copy",
      ]),
    ).toBe("Adults Monthly copy 2");
  });

  it("builds recent activity from invoices", () => {
    const activity = activityFromInvoices([
      {
        id: "inv-1",
        status: "PAID",
        paidAt: "2025-04-12T04:54:00.000Z",
        periodStart: "2025-04-12T00:00:00.000Z",
        paymentMethod: "CASH",
        student: { name: "Admin" },
        membership: {
          periodStart: "2025-04-12T00:00:00.000Z",
          subscription: { name: "Kids Monthly" },
        },
      },
      {
        id: "inv-2",
        status: "REFUNDED",
        refundedAt: "2025-04-02T11:02:00.000Z",
        paymentMethod: "RAZORPAY",
        membership: { subscription: { name: "Kids Quarterly" } },
      },
    ]);

    expect(activity[0]).toMatchObject({
      planName: "Kids Monthly",
      verb: "Activated",
      actor: "Staff",
    });
    expect(activity[1]).toMatchObject({
      planName: "Kids Quarterly",
      verb: "Cancelled",
      actor: "System",
    });
  });
});
