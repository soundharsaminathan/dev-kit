import { describe, expect, it } from "vitest";
import {
  assertCalendarRange,
  type BookingForCalendar,
  bookingMatchesScope,
  buildCalendarEvents,
  buildUnscheduledBookings,
  resolveBookingTimes,
  type SessionForCalendar,
  sessionMatchesScope,
  toBookingEvent,
} from "./calendar-query";

const baseSession = (
  overrides: Partial<SessionForCalendar> = {},
): SessionForCalendar => ({
  id: "s1",
  startsAt: new Date("2026-07-20T10:00:00.000Z"),
  endsAt: new Date("2026-07-20T11:00:00.000Z"),
  status: "SCHEDULED",
  batchId: "b1",
  trainerId: null,
  batch: {
    name: "Kids Hip-Hop",
    studioId: "studio-1",
    branchId: "branch-1",
    branch: { id: "branch-1", name: "Main" },
    trainers: [{ trainerId: "trainer-1" }],
    enrollments: [{ studentId: "student-1" }],
  },
  ...overrides,
});

const baseBooking = (
  overrides: Partial<BookingForCalendar> = {},
): BookingForCalendar => ({
  id: "bk1",
  type: "PRIVATE",
  status: "CONFIRMED",
  studentId: "student-1",
  trainerId: "trainer-1",
  studioId: "studio-1",
  sessionId: null,
  startsAt: new Date("2026-07-21T14:00:00.000Z"),
  endsAt: new Date("2026-07-21T15:00:00.000Z"),
  session: null,
  ...overrides,
});

describe("assertCalendarRange", () => {
  it("rejects inverted ranges", () => {
    expect(() =>
      assertCalendarRange(new Date("2026-08-01"), new Date("2026-07-01")),
    ).toThrow(/after from/);
  });

  it("rejects ranges over 62 days", () => {
    expect(() =>
      assertCalendarRange(new Date("2026-01-01"), new Date("2026-04-01")),
    ).toThrow(/62 days/);
  });
});

describe("sessionMatchesScope", () => {
  const query = {
    from: new Date("2026-07-01"),
    to: new Date("2026-07-31"),
    studioId: "studio-1",
  };

  it("includes enrolled student sessions", () => {
    expect(
      sessionMatchesScope(baseSession(), {
        ...query,
        studentId: "student-1",
      }),
    ).toBe(true);
  });

  it("excludes other students", () => {
    expect(
      sessionMatchesScope(baseSession(), {
        ...query,
        studentId: "student-2",
      }),
    ).toBe(false);
  });

  it("filters by trainer and branch", () => {
    expect(
      sessionMatchesScope(baseSession(), {
        ...query,
        trainerId: "trainer-1",
        branchId: "branch-1",
      }),
    ).toBe(true);
    expect(
      sessionMatchesScope(baseSession(), {
        ...query,
        branchId: "branch-2",
      }),
    ).toBe(false);
  });
});

describe("bookingMatchesScope", () => {
  const query = {
    from: new Date("2026-07-01"),
    to: new Date("2026-07-31"),
    studioId: "studio-1",
  };

  it("includes timed confirmed bookings", () => {
    expect(bookingMatchesScope(baseBooking(), query, true)).toBe(true);
  });

  it("excludes pending bookings", () => {
    expect(
      bookingMatchesScope(baseBooking({ status: "PENDING" }), query, true),
    ).toBe(false);
  });

  it("requires session branch for branch filter", () => {
    expect(
      bookingMatchesScope(
        baseBooking(),
        { ...query, branchId: "branch-1" },
        true,
      ),
    ).toBe(false);

    const withSession = baseBooking({
      startsAt: null,
      endsAt: null,
      sessionId: "s1",
      session: {
        id: "s1",
        startsAt: new Date("2026-07-21T14:00:00.000Z"),
        endsAt: new Date("2026-07-21T15:00:00.000Z"),
        batch: {
          id: "b1",
          name: "Kids",
          branchId: "branch-1",
          branch: { id: "branch-1", name: "Main" },
        },
      },
    });
    expect(
      bookingMatchesScope(
        withSession,
        { ...query, branchId: "branch-1" },
        true,
      ),
    ).toBe(true);
  });

  it("marks untimed confirmed bookings as unscheduled", () => {
    const untimed = baseBooking({ startsAt: null, endsAt: null });
    expect(bookingMatchesScope(untimed, query, true)).toBe(false);
    expect(bookingMatchesScope(untimed, query, false)).toBe(true);
  });
});

describe("toBookingEvent", () => {
  it("uses the real batch name for a trial on a session", () => {
    const times = {
      startsAt: new Date("2026-07-21T14:00:00.000Z"),
      endsAt: new Date("2026-07-21T15:00:00.000Z"),
    };
    const event = toBookingEvent(
      baseBooking({
        type: "TRIAL",
        sessionId: "s1",
        startsAt: null,
        endsAt: null,
        session: {
          id: "s1",
          startsAt: times.startsAt,
          endsAt: times.endsAt,
          batch: {
            id: "b1",
            name: "Kids Hip-Hop",
            branchId: "branch-1",
            branch: { id: "branch-1", name: "Main" },
          },
        },
      }),
      times,
    );
    expect(event.title).toBe("Kids Hip-Hop");
    expect(event.title).not.toMatch(/trial/i);
  });

  it("falls back to the booking type when there is no batch", () => {
    const times = {
      startsAt: new Date("2026-07-21T14:00:00.000Z"),
      endsAt: new Date("2026-07-21T15:00:00.000Z"),
    };
    expect(toBookingEvent(baseBooking({ type: "TRIAL" }), times).title).toBe(
      "Trial",
    );
    expect(toBookingEvent(baseBooking({ type: "PRIVATE" }), times).title).toBe(
      "Private",
    );
  });
});

describe("buildCalendarEvents", () => {
  it("merges and sorts sessions and bookings", () => {
    const events = buildCalendarEvents([baseSession()], [baseBooking()], {
      from: new Date("2026-07-01"),
      to: new Date("2026-07-31"),
      studioId: "studio-1",
    });
    expect(events).toHaveLength(2);
    expect(events[0]?.kind).toBe("SESSION");
    expect(events[1]?.kind).toBe("BOOKING");
    expect(resolveBookingTimes(baseBooking())?.startsAt.toISOString()).toBe(
      "2026-07-21T14:00:00.000Z",
    );
  });

  it("does not add a trial chip when the batch session is already listed", () => {
    const session = baseSession();
    const trialOnSession = baseBooking({
      type: "TRIAL",
      sessionId: session.id,
      startsAt: null,
      endsAt: null,
      session: {
        id: session.id,
        startsAt: session.startsAt,
        endsAt: session.endsAt,
        batch: {
          id: session.batchId,
          name: session.batch.name,
          branchId: session.batch.branchId,
          branch: session.batch.branch,
        },
      },
    });
    const events = buildCalendarEvents([session], [trialOnSession], {
      from: new Date("2026-07-01"),
      to: new Date("2026-07-31"),
      studioId: "studio-1",
    });
    expect(events).toHaveLength(1);
    expect(events[0]?.kind).toBe("SESSION");
    expect(events[0]?.title).toBe("Kids Hip-Hop");
  });

  it("keeps a trial booking when the session is not in the calendar scope", () => {
    const trialOnOtherSession = baseBooking({
      type: "TRIAL",
      sessionId: "s-other",
      startsAt: null,
      endsAt: null,
      session: {
        id: "s-other",
        startsAt: new Date("2026-07-21T14:00:00.000Z"),
        endsAt: new Date("2026-07-21T15:00:00.000Z"),
        batch: {
          id: "b-other",
          name: "Kids Hip-Hop",
          branchId: "branch-1",
          branch: { id: "branch-1", name: "Main" },
        },
      },
    });
    const events = buildCalendarEvents([], [trialOnOtherSession], {
      from: new Date("2026-07-01"),
      to: new Date("2026-07-31"),
      studioId: "studio-1",
      studentId: "student-1",
    });
    expect(events).toHaveLength(1);
    expect(events[0]?.kind).toBe("BOOKING");
    expect(events[0]?.title).toBe("Kids Hip-Hop");
  });
});

describe("buildUnscheduledBookings", () => {
  it("returns confirmed bookings without times", () => {
    const items = buildUnscheduledBookings(
      [
        baseBooking({ startsAt: null, endsAt: null }),
        baseBooking({ id: "bk2" }),
      ],
      { studioId: "studio-1" },
    );
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe("bk1");
  });
});
