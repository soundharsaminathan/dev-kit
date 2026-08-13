import type { AgeRange, BookingStatus } from "@prisma/client";

export const LEAD_DATE_FILTERS = ["all", "today", "tomorrow"] as const;

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

export function isLeadDateFilter(value: string): value is LeadDateFilter {
  return (LEAD_DATE_FILTERS as readonly string[]).includes(value);
}

export function resolveLeadDayRange(
  filter: LeadDateFilter,
): { start: Date; end: Date } | null {
  if (filter === "all") return null;

  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (filter === "tomorrow") {
    base.setDate(base.getDate() + 1);
  }

  const start = new Date(base);
  const end = new Date(base);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}
