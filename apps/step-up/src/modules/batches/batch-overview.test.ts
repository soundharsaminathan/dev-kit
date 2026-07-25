import { describe, expect, it } from "vitest";
import {
  countTrialEnrollments,
  enrollmentModeLabel,
  fillPercent,
  nextUpcomingSession,
  occupiedSeatsForOverview,
  sessionTimingState,
  upcomingSessions,
} from "./batch-overview-helpers";

describe("batch-overview helpers", () => {
  it("prefers occupiedSeats then derives from remaining", () => {
    expect(
      occupiedSeatsForOverview({
        occupiedSeats: 12,
        capacity: 25,
        remainingSeats: 10,
      }),
    ).toBe(12);
    expect(
      occupiedSeatsForOverview({
        capacity: 25,
        remainingSeats: 13,
      }),
    ).toBe(12);
  });

  it("computes fill percent capped at 100", () => {
    expect(fillPercent(12, 25)).toBe(48);
    expect(fillPercent(30, 25)).toBe(100);
    expect(fillPercent(0, 0)).toBe(0);
  });

  it("counts trial enrollments", () => {
    expect(
      countTrialEnrollments([
        { isTrial: true },
        { isTrial: false },
        { isTrial: true },
        {},
      ]),
    ).toBe(2);
  });

  it("picks the next upcoming session", () => {
    const now = new Date("2026-07-25T12:00:00.000Z");
    const next = nextUpcomingSession(
      [
        {
          id: "past",
          startsAt: "2026-07-20T10:00:00.000Z",
          endsAt: "2026-07-20T11:00:00.000Z",
        },
        {
          id: "soon",
          startsAt: "2026-07-26T10:00:00.000Z",
          endsAt: "2026-07-26T11:00:00.000Z",
        },
        {
          id: "later",
          startsAt: "2026-08-02T10:00:00.000Z",
          endsAt: "2026-08-02T11:00:00.000Z",
        },
      ],
      now,
    );
    expect(next?.id).toBe("soon");
  });

  it("lists upcoming sessions and skips cancelled", () => {
    const now = new Date("2026-07-25T12:00:00.000Z");
    const list = upcomingSessions(
      [
        {
          id: "live",
          startsAt: "2026-07-25T11:30:00.000Z",
          endsAt: "2026-07-25T12:30:00.000Z",
        },
        {
          id: "cancelled",
          startsAt: "2026-07-26T10:00:00.000Z",
          endsAt: "2026-07-26T11:00:00.000Z",
          status: "CANCELLED",
        },
        {
          id: "soon",
          startsAt: "2026-07-27T10:00:00.000Z",
          endsAt: "2026-07-27T11:00:00.000Z",
        },
        {
          id: "later",
          startsAt: "2026-08-02T10:00:00.000Z",
          endsAt: "2026-08-02T11:00:00.000Z",
        },
      ],
      now,
      2,
    );
    expect(list.map((session) => session.id)).toEqual(["live", "soon"]);
  });

  it("classifies session timing", () => {
    const now = new Date("2026-07-25T12:00:00.000Z");
    expect(
      sessionTimingState(
        {
          id: "now",
          startsAt: "2026-07-25T11:00:00.000Z",
          endsAt: "2026-07-25T13:00:00.000Z",
        },
        now,
      ),
    ).toBe("now");
    expect(
      sessionTimingState(
        {
          id: "soon",
          startsAt: "2026-07-26T10:00:00.000Z",
          endsAt: "2026-07-26T11:00:00.000Z",
        },
        now,
      ),
    ).toBe("upcoming");
  });

  it("labels enrollment modes", () => {
    expect(enrollmentModeLabel("SELF_JOIN")).toBe("Self-join");
    expect(enrollmentModeLabel("STAFF_ONLY")).toBe("Staff enroll");
  });
});
