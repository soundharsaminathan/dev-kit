import type { AgeRange, BookingStatus } from "@prisma/client";

export const LEAD_DATE_FILTERS = [
  "all",
  "today",
  "tomorrow",
  "thisWeek",
  "nextWeek",
] as const;

export const LEAD_PAGE_SIZE = 25;
const LEAD_PAGE_SIZE_MAX = 50;

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
  trialBooking: {
    id: string;
    status: BookingStatus;
    sessionId: string | null;
    sessionStartsAt: string | null;
    batchName: string | null;
  } | null;
};

export type LeadPage = {
  items: LeadDto[];
  nextCursor: string | null;
  limit: number;
};

export function isLeadDateFilter(value: string): value is LeadDateFilter {
  return (LEAD_DATE_FILTERS as readonly string[]).includes(value);
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
  const query = search.trim().toLowerCase();
  if (!query) return true;
  const haystack = [lead.name, lead.phone]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
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
