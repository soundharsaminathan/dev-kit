import { describe, expect, it } from "vitest";
import { applyRsvpOptimistically } from "./optimistic-rsvp";
import type { ChatEventInfo } from "./types";

const USER_ID = "user-1";

function event(
  rsvps: Partial<ChatEventInfo["rsvps"]> = {},
): ChatEventInfo {
  return {
    id: "event-1",
    title: "New class session",
    description: null,
    startsAt: "2026-08-13T10:00:00.000Z",
    endsAt: "2026-08-13T11:00:00.000Z",
    locationLabel: null,
    latitude: null,
    longitude: null,
    rsvps: {
      GOING: rsvps.GOING ?? [],
      MAYBE: rsvps.MAYBE ?? [],
      DECLINED: rsvps.DECLINED ?? [],
    },
  };
}

describe("applyRsvpOptimistically", () => {
  it("adds the user to an empty status", () => {
    const result = applyRsvpOptimistically(event(), "GOING", USER_ID);
    expect(result.rsvps).toEqual({
      GOING: [USER_ID],
      MAYBE: [],
      DECLINED: [],
    });
  });

  it("moves the user from one status to another", () => {
    const result = applyRsvpOptimistically(
      event({ GOING: [USER_ID, "user-2"], MAYBE: ["user-3"] }),
      "MAYBE",
      USER_ID,
    );
    expect(result.rsvps).toEqual({
      GOING: ["user-2"],
      MAYBE: ["user-3", USER_ID],
      DECLINED: [],
    });
  });

  it("leaves the event unchanged when already on that status", () => {
    const source = event({ GOING: [USER_ID, "user-2"] });
    expect(applyRsvpOptimistically(source, "GOING", USER_ID)).toBe(source);
  });
});
