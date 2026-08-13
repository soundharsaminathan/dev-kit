import type { AgeRange } from "@/lib/constants";

export const LEAD_DATE_FILTERS = [
  "all",
  "today",
  "tomorrow",
  "thisWeek",
  "nextWeek",
] as const;

export const SWITCH_DATE_FILTERS = ["all", "today", "tomorrow"] as const;

export const LEAD_PAGE_SIZE = 25;

export type LeadDateFilter = (typeof LEAD_DATE_FILTERS)[number];

export type SwitchDateFilter = (typeof SWITCH_DATE_FILTERS)[number];

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

export type LeadPage = {
  items: Lead[];
  nextCursor: string | null;
  limit: number;
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
  thisWeek: "This week",
  nextWeek: "Next week",
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

export function matchesLeadSearch(
  lead: Pick<Lead, "name" | "phone">,
  search: string,
) {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  const haystack = [lead.name, lead.phone]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export function isTrialSoon(startsAt: string | null, filter: LeadDateFilter) {
  if (!startsAt) return false;
  if (filter !== "all") return true;

  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return false;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowEnd = new Date(todayStart);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
  tomorrowEnd.setHours(23, 59, 59, 999);

  return start >= todayStart && start <= tomorrowEnd;
}

export function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addLocalDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function startOfLocalWeek(date: Date) {
  const daysFromMonday = (date.getDay() + 6) % 7;
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() - daysFromMonday,
  );
}

export function slotDateKey(startsAt: string) {
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return null;
  return localDateKey(start);
}

export function defaultSessionDateKey(
  filter: LeadDateFilter,
  now: Date = new Date(),
) {
  if (filter === "today" || filter === "thisWeek") return localDateKey(now);
  if (filter === "tomorrow") return localDateKey(addLocalDays(now, 1));
  if (filter === "nextWeek") {
    return localDateKey(addLocalDays(startOfLocalWeek(now), 7));
  }
  return null;
}

export function slotMatchesDate(startsAt: string, dateKey: string | null) {
  if (!dateKey) return true;
  return slotDateKey(startsAt) === dateKey;
}

export function trialHorizonDateKey(now: Date = new Date(), days = 35) {
  return localDateKey(addLocalDays(now, days));
}

export function emptyLeadsDescription(
  filter: LeadDateFilter,
  hasSearch: boolean,
) {
  if (hasSearch) return "Try another name or clear your search.";
  if (filter === "all") return "Add a lead quickly when someone calls in.";
  return "Pick All to see every follow-up.";
}

export function emptyLeadsTitle(filter: LeadDateFilter, hasSearch: boolean) {
  if (hasSearch) return "No matching leads";
  if (filter === "all") return "No leads yet";
  if (filter === "today") return "No trials today";
  if (filter === "tomorrow") return "No trials tomorrow";
  if (filter === "thisWeek") return "No trials this week";
  return "No trials next week";
}
