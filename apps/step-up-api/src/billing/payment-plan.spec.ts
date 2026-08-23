import {
  BillingCadence,
  InvoiceChargeType,
  InvoiceStatus,
  SubscriptionKind,
} from "@prisma/client";
import { describe, expect, it } from "vitest";
import { buildInvoicePaymentPlan } from "./payment-plan";

describe("buildInvoicePaymentPlan", () => {
  const siblingPlans = [
    {
      batchId: "batch-1",
      subscriptionId: "sub-m",
      price: 1999,
      billingCadence: BillingCadence.MONTHLY,
      individualAudience: "ADULT" as const,
    },
    {
      batchId: "batch-1",
      subscriptionId: "sub-q",
      price: 5499,
      billingCadence: BillingCadence.QUARTERLY,
      individualAudience: "ADULT" as const,
    },
  ];

  it("returns both options when monthly and quarterly exist", () => {
    const plan = buildInvoicePaymentPlan({
      kind: "INDIVIDUAL",
      status: InvoiceStatus.OVERDUE,
      chargeType: InvoiceChargeType.PREPAID_FULL,
      batchId: "batch-1",
      membershipSubscription: {
        kind: SubscriptionKind.INDIVIDUAL,
        billingCadence: BillingCadence.MONTHLY,
        individualAudience: "ADULT",
      },
      siblingPlans,
    });

    expect(plan).toEqual({
      currentCadence: BillingCadence.MONTHLY,
      options: [
        {
          cadence: BillingCadence.MONTHLY,
          subscriptionId: "sub-m",
          price: 1999,
          label: "Monthly",
        },
        {
          cadence: BillingCadence.QUARTERLY,
          subscriptionId: "sub-q",
          price: 5499,
          label: "Quarterly",
        },
      ],
    });
  });

  it("returns null for family invoices", () => {
    expect(
      buildInvoicePaymentPlan({
        kind: "FAMILY",
        status: InvoiceStatus.PENDING,
        chargeType: InvoiceChargeType.PREPAID_FULL,
        batchId: "batch-1",
        membershipSubscription: {
          kind: SubscriptionKind.FAMILY,
          billingCadence: BillingCadence.MONTHLY,
          individualAudience: null,
        },
        siblingPlans,
      }),
    ).toBeNull();
  });

  it("returns null when only one cadence exists", () => {
    expect(
      buildInvoicePaymentPlan({
        kind: "INDIVIDUAL",
        status: InvoiceStatus.PENDING,
        chargeType: InvoiceChargeType.PREPAID_FULL,
        batchId: "batch-1",
        membershipSubscription: {
          kind: SubscriptionKind.INDIVIDUAL,
          billingCadence: BillingCadence.MONTHLY,
          individualAudience: "ADULT",
        },
        siblingPlans: [siblingPlans[0]!],
      }),
    ).toBeNull();
  });
});
