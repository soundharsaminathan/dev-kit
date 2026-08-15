import type { AgeRange, BookingStatus } from "@prisma/client";
import { matchesPersonSearch } from "./person-search";

export const LEAD_DATE_FILTERS = [
  "all",
  "today",
  "tomorrow",
  "thisWeek",
  "nextWeek",
] as const;

export const LEAD_PAGE_SIZE = 25;
const LEAD_PAGE_SIZE_MAX = 50;
export const LEAD_REMARK_MAX_LENGTH = 2000;

export type LeadDateFilter = (typeof LEAD_DATE_FILTERS)[number];

export type LeadSection = "new" | "trialBooked" | "archived";

export type LeadDto = {
  id: string;
  name: string;
  phone: string | null;
  photoUrl: string | null;
  ageRange: AgeRange | null;
  createdAt: string;
  active: boolean;
  section: LeadSection;
  lastFollowupAt: string | null;
  trialBooking: {
    id: string;
    status: BookingStatus;
    sessionId: string | null;
    sessionStartsAt: string | null;
    batchName: string | null;
  } | null;
};

export type LeadRemarkDto = {
  id: string;
  body: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
  };
};

export type LeadPage = {
  items: LeadDto[];
  nextCursor: string | null;
  limit: number;
};

export function isLeadDateFilter(value: string): value is LeadDateFilter {
  return (LEAD_DATE_FILTERS as readonly string[]).includes(value);
}

export function isIsoDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function resolveDateKeyRange(
  from: string,
  to: string,
): { start: Date; end: Date } | null {
  if (!isIsoDateKey(from) || !isIsoDateKey(to) || from > to) return null;
  const [fromYear, fromMonth, fromDay] = from.split("-").map(Number);
  const [toYear, toMonth, toDay] = to.split("-").map(Number);
  const start = new Date(fromYear, fromMonth - 1, fromDay);
  const end = new Date(toYear, toMonth - 1, toDay);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function startOfLocalWeek(now: Date): Date {
  const daysFromMonday = (now.getDay() + 6) % 7;
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - daysFromMonday,
  );
}

export function matchesLeadSearch(
  lead: Pick<LeadDto, "name" | "phone">,
  search: string,
) {
  return matchesPersonSearch(lead, search);
}

export function paginateLeads(
  leads: LeadDto[],
  options: { q?: string; cursor?: string; limit?: number } = {},
): LeadPage {
  const query = options.q?.trim() ?? "";
  const filtered = query
    ? leads.filter((lead) => matchesLeadSearch(lead, query))
    : leads;
  const requested = options.limit;
  const limit = Math.min(
    Math.max(
      1,
      requested == null || Number.isNaN(requested) ? LEAD_PAGE_SIZE : requested,
    ),
    LEAD_PAGE_SIZE_MAX,
  );
  let startIndex = 0;
  if (options.cursor) {
    const cursorIndex = filtered.findIndex(
      (lead) => lead.id === options.cursor,
    );
    startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0;
  }
  const page = filtered.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + page.length < filtered.length;
  return {
    items: page,
    nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
    limit,
  };
}

export function resolveLeadDayRange(
  filter: LeadDateFilter,
  now: Date = new Date(),
): { start: Date; end: Date } | null {
  if (filter === "all") return null;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (filter === "today" || filter === "tomorrow") {
    const start = new Date(today);
    if (filter === "tomorrow") {
      start.setDate(start.getDate() + 1);
    }
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  const weekStart = startOfLocalWeek(today);
  if (filter === "nextWeek") {
    weekStart.setDate(weekStart.getDate() + 7);
  }

  const start = new Date(weekStart);
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}
