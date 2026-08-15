import { CalendarDate } from "@internationalized/date";
import type { AgeRange } from "@/lib/constants";
import { matchesPersonSearch } from "@/lib/person-search";

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

export type LeadDateRange = {
  from: string;
  to: string;
};

export const QUICK_DATE_PRESETS = [
  "today",
  "tomorrow",
  "thisWeek",
  "nextWeek",
  "last7",
] as const;

export type QuickDatePreset = (typeof QUICK_DATE_PRESETS)[number];

export const QUICK_DATE_LABELS: Record<QuickDatePreset, string> = {
  today: "Today",
  tomorrow: "Tomorrow",
  thisWeek: "This week",
  nextWeek: "Next week",
  last7: "Last 7 days",
};

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
  lastFollowupAt: string | null;
  trialBooking: LeadTrialBooking | null;
};

export type LeadPage = {
  items: Lead[];
  nextCursor: string | null;
  limit: number;
};

export type LeadRemark = {
  id: string;
  body: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
  };
};

export const LEAD_REMARK_MAX_LENGTH = 2000;

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

export function formatRelativeFollowup(iso: string, now: Date = new Date()) {
  const start = new Date(iso);
  if (Number.isNaN(start.getTime())) return iso;
  const minutes = Math.floor((now.getTime() - start.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function formatFollowupChip(iso: string | null, now: Date = new Date()) {
  if (!iso) return "No follow-up";
  return formatRelativeFollowup(iso, now);
}

export function canConfirmTrialSession(trial: LeadTrialBooking | null) {
  return Boolean(trial?.sessionId && trial.status === "PENDING");
}

export function matchesLeadSearch(
  lead: Pick<Lead, "name" | "phone">,
  search: string,
) {
  return matchesPersonSearch(lead, search);
}

export function isTrialSoon(
  startsAt: string | null,
  range: LeadDateRange | null,
) {
  if (!startsAt) return false;
  if (range) return true;

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

export function localDayRangeIso(dateKey: string) {
  const [yearStr, monthStr, dayStr] = dateKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const start = new Date(year, month - 1, day);
  const end = new Date(year, month - 1, day + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

export function isDateKey(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function dateKeyToCalendarDate(dateKey: string): CalendarDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return new CalendarDate(year, month, day);
}

export function dateKeyToString(value: { toString(): string }): string | null {
  const key = value.toString().slice(0, 10);
  return isDateKey(key) ? key : null;
}

export function leadDateRangeToValue(
  range: LeadDateRange | null,
): { start: CalendarDate; end: CalendarDate } | null {
  if (!range) return null;
  const start = dateKeyToCalendarDate(range.from);
  const end = dateKeyToCalendarDate(range.to);
  if (!start || !end) return null;
  return { start, end };
}

export function leadDateRangeFromValue(
  value: {
    start?: { toString(): string } | null;
    end?: { toString(): string } | null;
  } | null,
): LeadDateRange | null {
  if (!value?.start || !value.end) return null;
  const from = dateKeyToString(value.start);
  const to = dateKeyToString(value.end);
  if (!from || !to || from > to) return null;
  return { from, to };
}

export function presetRange(
  preset: QuickDatePreset,
  now: Date = new Date(),
): LeadDateRange {
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case "today":
      return { from: localDateKey(todayDate), to: localDateKey(todayDate) };
    case "tomorrow": {
      const day = addLocalDays(todayDate, 1);
      return { from: localDateKey(day), to: localDateKey(day) };
    }
    case "thisWeek": {
      const start = startOfLocalWeek(todayDate);
      return {
        from: localDateKey(start),
        to: localDateKey(addLocalDays(start, 6)),
      };
    }
    case "nextWeek": {
      const start = addLocalDays(startOfLocalWeek(todayDate), 7);
      return {
        from: localDateKey(start),
        to: localDateKey(addLocalDays(start, 6)),
      };
    }
    case "last7":
      return {
        from: localDateKey(addLocalDays(todayDate, -6)),
        to: localDateKey(todayDate),
      };
  }
}

export function matchingPreset(
  range: LeadDateRange | null,
  now: Date = new Date(),
): QuickDatePreset | null {
  if (!range) return null;
  for (const preset of QUICK_DATE_PRESETS) {
    const candidate = presetRange(preset, now);
    if (candidate.from === range.from && candidate.to === range.to) {
      return preset;
    }
  }
  return null;
}

export function formatDateKey(dateKey: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return dateKey;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function rangeLabel(
  range: LeadDateRange,
  now: Date = new Date(),
): string {
  const preset = matchingPreset(range, now);
  if (preset) return QUICK_DATE_LABELS[preset];
  if (range.from === range.to) return formatDateKey(range.from);
  return `${formatDateKey(range.from)} – ${formatDateKey(range.to)}`;
}

export function emptyLeadsDescription(
  range: LeadDateRange | null,
  hasSearch: boolean,
) {
  if (hasSearch) return "Try another name or clear your search.";
  if (!range) return "Add a lead quickly when someone calls in.";
  return "Pick All or another date range to see more leads.";
}

export function emptyLeadsTitle(
  range: LeadDateRange | null,
  hasSearch: boolean,
) {
  if (hasSearch) return "No matching leads";
  if (!range) return "No leads yet";
  if (range.from === range.to) return "No trials on this date";
  return "No trials in this date range";
}
