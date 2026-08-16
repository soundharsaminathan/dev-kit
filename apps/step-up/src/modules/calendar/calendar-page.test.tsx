import { describe, expect, it } from "vitest";
import { branchSwitcherMode, resolveEventNavigation } from "./calendar-page";
import type { CalendarEvent } from "./types";

function session(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: "evt-1",
    kind: "SESSION",
    title: "Kids Hip Hop",
    startsAt: "2026-07-20T12:30:00.000Z",
    endsAt: "2026-07-20T13:30:00.000Z",
    status: "SCHEDULED",
    ...overrides,
  };
}

function booking(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: "evt-2",
    kind: "BOOKING",
    title: "Trial booking",
    startsAt: "2026-07-20T12:30:00.000Z",
    endsAt: "2026-07-20T13:30:00.000Z",
    status: "SCHEDULED",
    ...overrides,
  };
}

describe("branchSwitcherMode", () => {
  const twoBranches = [
    { id: "b1", name: "Main" },
    { id: "b2", name: "Annex" },
  ];

  it("shows a skeleton while branches load", () => {
    expect(
      branchSwitcherMode(undefined, { enabled: true, loading: true }),
    ).toBe("skeleton");
  });

  it("hides the switcher when there is only one branch", () => {
    expect(
      branchSwitcherMode([{ id: "b1", name: "Main" }], { enabled: true }),
    ).toBe("hidden");
  });

  it("hides the switcher when there are no branches", () => {
    expect(branchSwitcherMode([], { enabled: true })).toBe("hidden");
  });

  it("shows the switcher when there are multiple branches", () => {
    expect(branchSwitcherMode(twoBranches, { enabled: true })).toBe("ready");
  });

  it("hides the switcher when branch filtering is disabled", () => {
    expect(
      branchSwitcherMode(twoBranches, { enabled: false, loading: true }),
    ).toBe("hidden");
  });
});

describe("resolveEventNavigation", () => {
  describe("staff", () => {
    it("navigates a session tile directly to attendance", () => {
      expect(
        resolveEventNavigation(session({ sessionId: "s-1" }), true),
      ).toEqual({
        to: "/app/sessions/$id/attendance",
        params: { id: "s-1" },
      });
    });

    it("does not navigate a session without a session id", () => {
      expect(resolveEventNavigation(session(), true)).toBeNull();
    });

    it("navigates a booking tile to bookings", () => {
      expect(resolveEventNavigation(booking(), true)).toEqual({
        to: "/app/bookings",
      });
    });
  });

  describe("member", () => {
    it("navigates a session with a batch to the batch page", () => {
      expect(
        resolveEventNavigation(
          session({ sessionId: "s-1", batchId: "b-1" }),
          false,
        ),
      ).toEqual({ to: "/me/batches/$id", params: { id: "b-1" } });
    });

    it("navigates a session without a batch to check-in", () => {
      expect(
        resolveEventNavigation(session({ sessionId: "s-1" }), false),
      ).toEqual({ to: "/me/check-in" });
    });

    it("does not navigate a booking tile", () => {
      expect(resolveEventNavigation(booking(), false)).toBeNull();
    });
  });
});
