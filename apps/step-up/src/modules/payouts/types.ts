export type PayoutStatus = "DRAFT" | "SENT" | "PAID" | "CANCELLED";

export type TrainerPayout = {
  id: string;
  studioId: string;
  trainerId: string;
  trainerName: string;
  periodStart: string;
  periodEnd: string;
  sessionCount: number;
  amount: number | null;
  notes: string | null;
  status: PayoutStatus;
  sentAt: string | null;
  paidAt: string | null;
  createdAt: string;
};

export type TrainerPayoutSession = {
  id: string;
  batchId: string;
  batchName: string;
  startsAt: string;
  endsAt: string;
};

export type TrainerPayoutDetail = TrainerPayout & {
  sessions: TrainerPayoutSession[];
};

export const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PAID: "Paid",
  CANCELLED: "Cancelled",
};

export const PAYOUT_STATUS_TONES: Record<PayoutStatus, string> = {
  DRAFT: "neutral",
  SENT: "warning",
  PAID: "success",
  CANCELLED: "danger",
};

export function formatPayoutPeriod(periodStart: string) {
  const date = new Date(periodStart);
  if (Number.isNaN(date.getTime())) return periodStart;
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatPayoutAmount(amount: number | null) {
  if (amount === null) return "Not set";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
