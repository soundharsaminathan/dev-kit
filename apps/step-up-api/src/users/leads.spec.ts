import { AttendanceStatus, BookingStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  classifyLeadSection,
  isIsoDateKey,
  isLeadDateFilter,
  isLeadSection,
  LEAD_SECTIONS,
  LEAD_SECTIONS_WITH_DATE_FILTER,
  type LeadDto,
  type LeadSectionBookingInput,
  type LeadSectionInput,
  leadSectionAppliesDateFilter,
  matchesLeadSearch,
  paginateLeads,
  resolveDateKeyRange,
  resolveLeadDayRange,
  startOfLocalWeek,
} from "./leads";
import type { StudentFunnelEnrollmentInput } from "./student-funnel";

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

describe("isIsoDateKey", () => {
  it("accepts real YYYY-MM-DD keys and rejects malformed ones", () => {
    expect(isIsoDateKey("2026-08-14")).toBe(true);
    expect(isIsoDateKey("2026-08-01")).toBe(true);
    expect(isIsoDateKey("2026-02-28")).toBe(true);
    expect(isIsoDateKey("2026-13-01")).toBe(false);
    expect(isIsoDateKey("2026-02-31")).toBe(false);
    expect(isIsoDateKey("2026/08/14")).toBe(false);
    expect(isIsoDateKey("not-a-date")).toBe(false);
    expect(isIsoDateKey("")).toBe(false);
  });
});

describe("resolveDateKeyRange", () => {
  it("returns a local inclusive range for a single day", () => {
    const range = resolveDateKeyRange("2026-08-14", "2026-08-14");
    expect(range).not.toBeNull();
    if (!range) return;

    expect(range.start).toEqual(new Date(2026, 7, 14));
    expect(range.end.getFullYear()).toBe(2026);
    expect(range.end.getMonth()).toBe(7);
    expect(range.end.getDate()).toBe(14);
    expect(range.end.getHours()).toBe(23);
    expect(range.end.getMinutes()).toBe(59);
  });

  it("returns a range across multiple days", () => {
    const range = resolveDateKeyRange("2026-08-10", "2026-08-16");
    expect(range).not.toBeNull();
    if (!range) return;

    expect(range.start).toEqual(new Date(2026, 7, 10));
    expect(range.end.getDate()).toBe(16);
    expect(range.end.getHours()).toBe(23);
  });

  it("returns null for invalid or inverted keys", () => {
    expect(resolveDateKeyRange("2026-02-31", "2026-08-16")).toBeNull();
    expect(resolveDateKeyRange("2026-08-16", "2026-08-10")).toBeNull();
    expect(resolveDateKeyRange("2026-08-16", "bad")).toBeNull();
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
    lastFollowupAt: null,
    trialBooking: null,
  };
}

describe("matchesLeadSearch", () => {
  it("matches name or phone and ignores blank queries", () => {
    const row = lead("1", "Asha Rao", "+91 91234 56789");
    expect(matchesLeadSearch(row, "")).toBe(true);
    expect(matchesLeadSearch(row, "asha")).toBe(true);
    expect(matchesLeadSearch(row, "91234")).toBe(true);
    expect(matchesLeadSearch(row, "9123456789")).toBe(true);
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

describe("isLeadSection", () => {
  it("accepts every pipeline section and rejects unknown values", () => {
    for (const section of LEAD_SECTIONS) {
      expect(isLeadSection(section)).toBe(true);
    }
    expect(isLeadSection("all")).toBe(false);
    expect(isLeadSection("trial")).toBe(false);
    expect(isLeadSection(undefined)).toBe(false);
  });

  it("lists booked, attended and missed as the date-filter sections", () => {
    expect([...LEAD_SECTIONS_WITH_DATE_FILTER]).toEqual([
      "trialBooked",
      "trialAttended",
      "trialMissed",
    ]);
  });
});

describe("leadSectionAppliesDateFilter", () => {
  it("gates the date range to booked, attended and missed only", () => {
    expect(leadSectionAppliesDateFilter("new")).toBe(false);
    expect(leadSectionAppliesDateFilter("converted")).toBe(false);
    expect(leadSectionAppliesDateFilter("left")).toBe(false);
    expect(leadSectionAppliesDateFilter("archived")).toBe(false);
    expect(leadSectionAppliesDateFilter("trialBooked")).toBe(true);
    expect(leadSectionAppliesDateFilter("trialAttended")).toBe(true);
    expect(leadSectionAppliesDateFilter("trialMissed")).toBe(true);
  });
});

describe("classifyLeadSection", () => {
  const NOW = new Date("2026-08-15T12:00:00.000Z");
  const PAST = new Date("2026-08-10T10:00:00.000Z");
  const FUTURE = new Date("2026-08-20T10:00:00.000Z");

  function enrollment(
    overrides: Partial<StudentFunnelEnrollmentInput> = {},
  ): StudentFunnelEnrollmentInput {
    return {
      batchId: "batch-1",
      batchActive: true,
      enrollmentActive: true,
      hasScheduledSession: true,
      hasCompletedSession: false,
      ...overrides,
    };
  }

  function booking(
    overrides: Partial<LeadSectionBookingInput> = {},
  ): LeadSectionBookingInput {
    return {
      status: BookingStatus.PENDING,
      sessionId: "session-1",
      sessionStartsAt: null,
      ...overrides,
    };
  }

  function student(
    overrides: Partial<LeadSectionInput> = {},
  ): LeadSectionInput {
    return {
      active: true,
      enrollments: [],
      bookings: [],
      attendance: [],
      ...overrides,
    };
  }

  it("puts an inactive student in archived before left or converted", () => {
    const row = student({
      active: false,
      enrollments: [enrollment({ batchActive: true, enrollmentActive: true })],
      bookings: [
        booking({
          status: BookingStatus.CONFIRMED,
          sessionStartsAt: FUTURE,
        }),
      ],
    });
    expect(classifyLeadSection(row, NOW)).toBe("archived");
  });

  it("treats a previously enrolled student as left, never converted", () => {
    const inactiveEnrollment = student({
      enrollments: [enrollment({ enrollmentActive: false })],
    });
    expect(classifyLeadSection(inactiveEnrollment, NOW)).toBe("left");

    const closedBatch = student({
      enrollments: [enrollment({ batchActive: false })],
    });
    expect(classifyLeadSection(closedBatch, NOW)).toBe("left");
  });

  it("classifies an active enrollment as converted, not new", () => {
    const row = student({ enrollments: [enrollment()] });
    expect(classifyLeadSection(row, NOW)).toBe("converted");
  });

  it("classifies a completed trial booking as attended", () => {
    const row = student({
      bookings: [
        booking({ status: BookingStatus.COMPLETED, sessionStartsAt: PAST }),
      ],
    });
    expect(classifyLeadSection(row, NOW)).toBe("trialAttended");
  });

  it("classifies a present-marked past trial as attended", () => {
    const row = student({
      bookings: [
        booking({
          status: BookingStatus.CONFIRMED,
          sessionStartsAt: PAST,
        }),
      ],
      attendance: [
        { sessionId: "session-1", status: AttendanceStatus.PRESENT },
      ],
    });
    expect(classifyLeadSection(row, NOW)).toBe("trialAttended");
  });

  it("keeps an upcoming open trial in trial booked", () => {
    const row = student({
      bookings: [
        booking({ status: BookingStatus.CONFIRMED, sessionStartsAt: FUTURE }),
      ],
    });
    expect(classifyLeadSection(row, NOW)).toBe("trialBooked");
  });

  it("classifies a past unattended trial as missed", () => {
    const row = student({
      bookings: [
        booking({ status: BookingStatus.PENDING, sessionStartsAt: PAST }),
      ],
    });
    expect(classifyLeadSection(row, NOW)).toBe("trialMissed");
  });

  it("moves a missed student with an upcoming rebook back to trial booked", () => {
    const row = student({
      bookings: [
        booking({ status: BookingStatus.PENDING, sessionStartsAt: PAST }),
        booking({ status: BookingStatus.CONFIRMED, sessionStartsAt: FUTURE }),
      ],
    });
    expect(classifyLeadSection(row, NOW)).toBe("trialBooked");
  });

  it("returns new for an active student with no trial or batch history", () => {
    expect(classifyLeadSection(student(), NOW)).toBe("new");
  });

  it("ignores date filtering for new (gated by leadSectionAppliesDateFilter)", () => {
    expect(leadSectionAppliesDateFilter("new")).toBe(false);
  });
});
