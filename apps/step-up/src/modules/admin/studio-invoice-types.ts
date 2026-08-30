export type StudioPlan = "BASIC" | "ADVANCED";

export type StudioInvoiceStatus = "DRAFT" | "PENDING" | "PAID" | "VOID";

export type StudioInvoicePaymentMethod = "CASH" | "UPI_MANUAL";

export type StudioUsageCounts = {
  activeStudents: number;
  trainers: number;
  staff: number;
  batches: number;
  sessionsThisMonth: number;
};

export type StudioUsageResponse = StudioUsageCounts & {
  month: string;
  periodStart: string;
  periodEnd: string;
  timezone: string;
  suggestedPlan: StudioPlan;
  suggestedAmount: number;
};

export type StudioInvoice = {
  id: string;
  studioId: string;
  billedUserId: string;
  createdById: string;
  status: StudioInvoiceStatus;
  plan: StudioPlan;
  listAmount: number;
  discount: number;
  amountDue: number;
  month: string;
  periodStart: string;
  periodEnd: string;
  usageSnapshot: StudioUsageCounts;
  notes: string | null;
  publishedAt: string | null;
  paidAt: string | null;
  paymentMethod: StudioInvoicePaymentMethod | null;
  createdAt: string;
  updatedAt: string;
};

export const STUDIO_PLAN_AMOUNTS: Record<StudioPlan, number> = {
  BASIC: 999,
  ADVANCED: 1499,
};

export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function planLabel(plan: StudioPlan): string {
  return plan === "BASIC" ? "Basic" : "Advanced";
}

export function statusLabel(status: StudioInvoiceStatus): string {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "PENDING":
      return "Pending";
    case "PAID":
      return "Paid";
    case "VOID":
      return "Void";
  }
}

export function currentMonthKey(at = new Date()): string {
  const year = at.getFullYear();
  const month = String(at.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}
