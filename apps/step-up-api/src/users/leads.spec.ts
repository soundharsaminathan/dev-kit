import { describe, expect, it } from "vitest";
import {
  isLeadDateFilter,
  type LeadDto,
  matchesLeadSearch,
  paginateLeads,
  resolveLeadDayRange,
  startOfLocalWeek,
} from "./leads";

describe("resolveLeadDayRange", () => {
  it("returns null for all", () => {
    expect(resolveLeadDayRange("all")).toBeNull();
  });

  it("returns today midnight to end-of-day", () => {
    const range = resolveLeadDayRange("today");
    expect(range).not.toBeNull();
    if (!range) return;

    const now = new Date();
    expect(range.start.getFullYear()).toBe(now.getFullYear());
    expect(range.start.getMonth()).toBe(now.getMonth());
    expect(range.start.getDate()).toBe(now.getDate());
    expect(range.start.getHours()).toBe(0);
    expect(range.start.getMinutes()).toBe(0);
    expect(range.end.getHours()).toBe(23);
    expect(range.end.getMinutes()).toBe(59);
    expect(range.end.getDate()).toBe(now.getDate());
  });

  it("returns tomorrow midnight to end-of-day", () => {
    const range = resolveLeadDayRange("tomorrow");
    expect(range).not.toBeNull();
    if (!range) return;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(range.start.getDate()).toBe(tomorrow.getDate());
    expect(range.start.getHours()).toBe(0);
    expect(range.end.getDate()).toBe(tomorrow.getDate());
    expect(range.end.getHours()).toBe(23);
  });

  it("returns Monday through Sunday for this week", () => {
    const friday = new Date(2026, 7, 14, 15, 30, 0);
    expect(friday.getDay()).toBe(5);

    const range = resolveLeadDayRange("thisWeek", friday);
    expect(range).not.toBeNull();
    if (!range) return;

    expect(range.start).toEqual(new Date(2026, 7, 10));
    expect(range.end.getFullYear()).toBe(2026);
    expect(range.end.getMonth()).toBe(7);
    expect(range.end.getDate()).toBe(16);
    expect(range.end.getHours()).toBe(23);
    expect(range.end.getMinutes()).toBe(59);
  });

  it("returns the following Monday through Sunday for next week", () => {
    const friday = new Date(2026, 7, 14, 15, 30, 0);
    const range = resolveLeadDayRange("nextWeek", friday);
    expect(range).not.toBeNull();
    if (!range) return;

    expect(range.start).toEqual(new Date(2026, 7, 17));
    expect(range.end.getDate()).toBe(23);
    expect(range.end.getHours()).toBe(23);
  });

  it("keeps Sunday inside the current week starting Monday", () => {
    const sunday = new Date(2026, 7, 16, 9, 0, 0);
    expect(sunday.getDay()).toBe(0);
    const range = resolveLeadDayRange("thisWeek", sunday);
    expect(range?.start).toEqual(new Date(2026, 7, 10));
    expect(range?.end.getDate()).toBe(16);
  });
});

describe("startOfLocalWeek", () => {
  it("returns the same Monday for every day in that week", () => {
    const monday = new Date(2026, 7, 10);
    expect(startOfLocalWeek(monday)).toEqual(monday);
    expect(startOfLocalWeek(new Date(2026, 7, 12))).toEqual(monday);
    expect(startOfLocalWeek(new Date(2026, 7, 16))).toEqual(monday);
  });
});

describe("isLeadDateFilter", () => {
  it("accepts week filters and rejects unknown values", () => {
    expect(isLeadDateFilter("thisWeek")).toBe(true);
    expect(isLeadDateFilter("nextWeek")).toBe(true);
    expect(isLeadDateFilter("this_week")).toBe(false);
  });
});

function lead(
  id: string,
  name: string,
  phone: string | null = "9000000000",
): LeadDto {
  return {
    id,
    name,
    phone,
    photoUrl: null,
    ageRange: "TWENTY_TO_FORTY",
    createdAt: "2026-08-01T00:00:00.000Z",
    active: true,
    section: "new",
    trialBooking: null,
  };
}

describe("matchesLeadSearch", () => {
  it("matches name or phone and ignores blank queries", () => {
    const row = lead("1", "Asha Rao", "+91 91234 56789");
    expect(matchesLeadSearch(row, "")).toBe(true);
    expect(matchesLeadSearch(row, "asha")).toBe(true);
    expect(matchesLeadSearch(row, "91234")).toBe(true);
    expect(matchesLeadSearch(row, "nope")).toBe(false);
  });
});

describe("paginateLeads", () => {
  const leads = Array.from({ length: 30 }, (_, index) =>
    lead(
      `id-${String(index).padStart(2, "0")}`,
      `Lead ${index}`,
      `90000000${String(index).padStart(2, "0")}`,
    ),
  );

  it("returns the first page and a cursor when more remain", () => {
    const page = paginateLeads(leads, { limit: 25 });
    expect(page.items).toHaveLength(25);
    expect(page.nextCursor).toBe("id-24");
    expect(page.limit).toBe(25);
  });

  it("returns the remaining rows after the cursor", () => {
    const page = paginateLeads(leads, { limit: 25, cursor: "id-24" });
    expect(page.items.map((row) => row.id)).toEqual([
      "id-25",
      "id-26",
      "id-27",
      "id-28",
      "id-29",
    ]);
    expect(page.nextCursor).toBeNull();
  });

  it("filters by search before paginating", () => {
    const page = paginateLeads(leads, { q: "Lead 1", limit: 25 });
    expect(page.items.map((row) => row.name)).toEqual([
      "Lead 1",
      "Lead 10",
      "Lead 11",
      "Lead 12",
      "Lead 13",
      "Lead 14",
      "Lead 15",
      "Lead 16",
      "Lead 17",
      "Lead 18",
      "Lead 19",
    ]);
    expect(page.nextCursor).toBeNull();
  });

  it("returns an empty page when nothing matches", () => {
    const page = paginateLeads(leads, { q: "zzz", limit: 25 });
    expect(page.items).toEqual([]);
    expect(page.nextCursor).toBeNull();
  });
});
