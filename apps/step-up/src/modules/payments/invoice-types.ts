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
  } | null;
  chargeType?: "POSTPAID_PRORATED" | "PREPAID_PRORATED" | "PREPAID_FULL";
  attendedSessionCount?: number | null;
  billedSessionCount?: number | null;
  canConvertToQuarterly?: boolean;
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

export type InvoiceMonthSource = Pick<
  Invoice,
  "membership" | "dueDate" | "paidAt" | "refundedAt"
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
