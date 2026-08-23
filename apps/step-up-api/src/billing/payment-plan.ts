import {
  BillingCadence,
  type IndividualAudience,
  InvoiceChargeType,
  InvoiceStatus,
  SubscriptionKind,
} from "@prisma/client";

export type PaymentPlanOption = {
  cadence: BillingCadence;
  subscriptionId: string;
  price: number;
  label: string;
};

export type InvoicePaymentPlan = {
  currentCadence: BillingCadence;
  options: PaymentPlanOption[];
};

export type SiblingPlanRow = {
  batchId: string;
  subscriptionId: string;
  price: number;
  billingCadence: BillingCadence;
  individualAudience: IndividualAudience | null;
};

const CADENCE_LABEL: Record<BillingCadence, string> = {
  [BillingCadence.MONTHLY]: "Monthly",
  [BillingCadence.QUARTERLY]: "Quarterly",
};

export function cadenceLabel(cadence: BillingCadence): string {
  return CADENCE_LABEL[cadence];
}

export function isPaymentPlanEligible(input: {
  kind: "INDIVIDUAL" | "FAMILY" | "COMBINED";
  status: InvoiceStatus | string;
  chargeType: InvoiceChargeType | string | null | undefined;
  batchId: string | null | undefined;
  membershipSubscription: {
    kind: string;
    billingCadence: BillingCadence;
    individualAudience: IndividualAudience | null;
  } | null;
}): boolean {
  if (input.kind !== "INDIVIDUAL") return false;
  if (
    input.status !== InvoiceStatus.PENDING &&
    input.status !== InvoiceStatus.OVERDUE
  ) {
    return false;
  }
  if (input.chargeType !== InvoiceChargeType.PREPAID_FULL) return false;
  if (!input.batchId) return false;
  if (!input.membershipSubscription) return false;
  if (input.membershipSubscription.kind !== SubscriptionKind.INDIVIDUAL) {
    return false;
  }
  return true;
}

export function buildInvoicePaymentPlan(input: {
  kind: "INDIVIDUAL" | "FAMILY" | "COMBINED";
  status: InvoiceStatus | string;
  chargeType: InvoiceChargeType | string | null | undefined;
  batchId: string | null | undefined;
  membershipSubscription: {
    kind: string;
    billingCadence: BillingCadence;
    individualAudience: IndividualAudience | null;
  } | null;
  siblingPlans: SiblingPlanRow[];
}): InvoicePaymentPlan | null {
  if (
    !isPaymentPlanEligible({
      kind: input.kind,
      status: input.status,
      chargeType: input.chargeType,
      batchId: input.batchId,
      membershipSubscription: input.membershipSubscription,
    })
  ) {
    return null;
  }

  const subscription = input.membershipSubscription!;
  const batchId = input.batchId!;
  const audience = subscription.individualAudience;

  const matching = input.siblingPlans.filter(
    (plan) =>
      plan.batchId === batchId &&
      plan.individualAudience === audience &&
      (plan.billingCadence === BillingCadence.MONTHLY ||
        plan.billingCadence === BillingCadence.QUARTERLY),
  );

  const byCadence = new Map<BillingCadence, SiblingPlanRow>();
  for (const plan of matching) {
    if (!byCadence.has(plan.billingCadence)) {
      byCadence.set(plan.billingCadence, plan);
    }
  }

  const monthly = byCadence.get(BillingCadence.MONTHLY);
  const quarterly = byCadence.get(BillingCadence.QUARTERLY);
  if (!monthly || !quarterly) return null;

  const options: PaymentPlanOption[] = [monthly, quarterly].map((plan) => ({
    cadence: plan.billingCadence,
    subscriptionId: plan.subscriptionId,
    price: plan.price,
    label: cadenceLabel(plan.billingCadence),
  }));

  return {
    currentCadence: subscription.billingCadence,
    options,
  };
}
