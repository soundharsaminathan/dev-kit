export type CoveredSeat = {
  studentId: string;
  seatRole: "ADULT" | "KID";
  batchId?: string;
};

export type CombineSource = {
  invoiceId: string;
  studentId: string;
  batchId: string | null;
  originalAmount: number;
  allocatedDiscount: number;
  netAmount: number;
};

export type BillingCadence = "MONTHLY" | "QUARTERLY";

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

export type Invoice = {
  id: string;
  studentId: string;
  amount: number;
  referralDiscount?: number;
  studioDiscount?: number;
  familyDiscount?: number;
  refundedAmount?: number;
  gstPercent?: number;
  status: "PENDING" | "PAID" | "OVERDUE" | "REFUNDED";
  paymentMethod?: "CASH" | "UPI_MANUAL" | "RAZORPAY" | null;
  paidAt?: string | null;
  refundedAt?: string | null;
  kind: "FAMILY" | "INDIVIDUAL" | "COMBINED";
  batchId?: string | null;
  batchName?: string | null;
  student?: { name: string };
  membership?: {
    periodStart?: string | null;
    periodEnd?: string | null;
    subscription?: {
      name?: string;
      billingCadence?: BillingCadence;
      kind?: string;
    } | null;
  } | null;
  chargeType?:
    | "POSTPAID_PRORATED"
    | "PREPAID_PRORATED"
    | "PREPAID_FULL"
    | "ADMISSION";
  attendedSessionCount?: number | null;
  billedSessionCount?: number | null;
  canConvertToQuarterly?: boolean;
  paymentPlan?: InvoicePaymentPlan | null;
  dueDate?: string | null;
  familySummary?: {
    planName: string | null;
    adultCount: number | null;
    kidCount: number | null;
    coveredStudents: CoveredSeat[] | null;
  } | null;
  purchaseMeta?: {
    subscriptionId: string;
    purchaserUserId: string;
    coveredStudents: CoveredSeat[];
  } | null;
  combineMeta?: {
    sources: CombineSource[];
  } | null;
};

export type StudioFamily = {
  ownerId: string;
  ownerName: string;
  ownerRole: "OWNER" | "STAFF" | "TRAINER" | "STUDENT" | "PARENT";
  ownerPhotoUrl: string | null;
  members: Array<{
    id: string;
    name: string;
    photoUrl: string | null;
    seatRole: "ADULT" | "KID";
  }>;
};

export type ManualPaymentMethod = "CASH" | "UPI_MANUAL";

export function formatPrice(amount: number | string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

export function computeGst(amount: number, gstPercent: number): number {
  return Math.round(amount * (gstPercent / 100) * 100) / 100;
}

/** Savings when paying quarterly vs 3× monthly; 0 when not applicable. */
export function quarterlyPlanSavings(
  plan: InvoicePaymentPlan | null | undefined,
): number {
  if (!plan) return 0;
  const monthly = plan.options.find((o) => o.cadence === "MONTHLY");
  const quarterly = plan.options.find((o) => o.cadence === "QUARTERLY");
  if (!monthly || !quarterly) return 0;
  const savings = Math.round((monthly.price * 3 - quarterly.price) * 100) / 100;
  return savings > 0 ? savings : 0;
}

export function paymentPlanPrice(
  plan: InvoicePaymentPlan | null | undefined,
  cadence: BillingCadence,
  fallbackAmount: number,
): number {
  const option = plan?.options.find((o) => o.cadence === cadence);
  return option?.price ?? fallbackAmount;
}

export function cadenceDisplayLabel(cadence: BillingCadence): string {
  return cadence === "QUARTERLY" ? "Quarterly" : "Monthly";
}

export function cadencePriceHint(
  plan: InvoicePaymentPlan,
  cadence: BillingCadence,
): string {
  const option = plan.options.find((o) => o.cadence === cadence);
  if (!option) return "";
  if (cadence === "QUARTERLY") {
    const savings = quarterlyPlanSavings(plan);
    const base = `${formatPrice(option.price)} / 3 months`;
    return savings > 0 ? `${base} · Save ${formatPrice(savings)}` : base;
  }
  return `${formatPrice(option.price)} / month`;
}

export type InvoiceMonthSource = Pick<
  Invoice,
  "membership" | "dueDate" | "paidAt" | "refundedAt" | "status"
>;

export function utcMonthKey(date: Date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function recentUtcMonthKeys(count = 12, now = new Date()): string[] {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, month - index, 1));
    return utcMonthKey(date);
  });
}

export function formatInvoiceMonthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return key;
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function invoiceMonthKey(invoice: InvoiceMonthSource): string | null {
  const source =
    invoice.membership?.periodStart ??
    invoice.dueDate ??
    invoice.paidAt ??
    invoice.refundedAt;
  if (!source) return null;
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) return null;
  return utcMonthKey(date);
}

export function invoiceMatchesMonth(
  invoice: InvoiceMonthSource,
  monthKey: string,
): boolean {
  if (monthKey === "ALL") return true;
  return invoiceMonthKey(invoice) === monthKey;
}

export function allocateFamilyDiscount(
  amounts: number[],
  familyDiscount: number,
): number[] {
  const subtotal =
    Math.round(amounts.reduce((sum, n) => sum + n, 0) * 100) / 100;
  if (amounts.length === 0) return [];
  if (familyDiscount < 0 || familyDiscount > subtotal) {
    throw new Error("Invalid family discount");
  }
  if (subtotal === 0) return amounts.map(() => 0);
  const allocated: number[] = [];
  let remaining = familyDiscount;
  for (let i = 0; i < amounts.length; i += 1) {
    if (i === amounts.length - 1) {
      allocated.push(Math.round(remaining * 100) / 100);
      break;
    }
    const share =
      Math.round(((familyDiscount * amounts[i]!) / subtotal) * 100) / 100;
    allocated.push(share);
    remaining = Math.round((remaining - share) * 100) / 100;
  }
  return allocated;
}
