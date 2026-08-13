import type { AgeRange } from "@/lib/constants";

export const LEAD_DATE_FILTERS = ["all", "today", "tomorrow"] as const;

export type LeadDateFilter = (typeof LEAD_DATE_FILTERS)[number];

export type LeadSection = "new" | "trialBooked" | "archived";

export type LeadTrialBooking = {
  id: string;
  status: string;
  sessionId: string | null;
  sessionStartsAt: string | null;
  batchName: string | null;
};

export type Lead = {
  id: string;
  name: string;
  phone: string | null;
  photoUrl: string | null;
  ageRange: AgeRange | null;
  createdAt: string;
  active: boolean;
  section: LeadSection;
  trialBooking: LeadTrialBooking | null;
};

export type TrialSlot = {
  sessionId: string;
  batchId: string;
  batchName: string;
  styleBadge: string | null;
  startsAt: string;
  endsAt: string;
};

export const FILTER_LABELS: Record<LeadDateFilter, string> = {
  all: "All",
  today: "Today",
  tomorrow: "Tomorrow",
};

export const SECTION_LABELS: Record<LeadSection, string> = {
  new: "New leads",
  trialBooked: "Trial booked",
  archived: "Archived",
};

export function formatTrialWhen(startsAt: string) {
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return startsAt;
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(start);
}

export function ageRangeLabel(ageRange: AgeRange | null) {
  if (!ageRange) return null;
  const labels: Record<AgeRange, string> = {
    UNDER_10: "Under 10",
    TEN_TO_TWENTY: "10–20",
    TWENTY_TO_FORTY: "20–40",
    FORTY_PLUS: "40+",
  };
  return labels[ageRange];
}

export function phoneTelHref(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : null;
}

export function canConfirmTrialSession(trial: LeadTrialBooking | null) {
  return Boolean(trial?.sessionId && trial.status === "PENDING");
}

export function isTrialSoon(startsAt: string | null, filter: LeadDateFilter) {
  if (!startsAt) return false;
  if (filter === "today" || filter === "tomorrow") return true;

  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return false;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowEnd = new Date(todayStart);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
  tomorrowEnd.setHours(23, 59, 59, 999);

  return start >= todayStart && start <= tomorrowEnd;
}
