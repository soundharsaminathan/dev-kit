import { afterEach, describe, expect, it } from "vitest";
import {
  applyRsvpOptimistically,
  clearPendingRsvp,
  isCurrentPendingRsvp,
  mergeEventWithPendingRsvp,
  resetPendingRsvpsForTests,
  setPendingRsvp,
} from "./optimistic-rsvp";
import type { ChatEventInfo } from "./types";

const USER_ID = "user-1";
const OTHER_ID = "user-2";

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
      event({ GOING: [USER_ID, OTHER_ID], MAYBE: ["user-3"] }),
      "MAYBE",
      USER_ID,
    );
    expect(result.rsvps).toEqual({
      GOING: [OTHER_ID],
      MAYBE: ["user-3", USER_ID],
      DECLINED: [],
    });
  });

  it("leaves the event unchanged when already on that status", () => {
    const source = event({ GOING: [USER_ID, OTHER_ID] });
    expect(applyRsvpOptimistically(source, "GOING", USER_ID)).toBe(source);
  });
});

describe("pending RSVP latest-write-wins", () => {
  afterEach(() => {
    resetPendingRsvpsForTests();
  });

  it("keeps the latest local choice over a stale remote Going", () => {
    setPendingRsvp("event-1", "GOING", USER_ID);
    const maybeGeneration = setPendingRsvp("event-1", "MAYBE", USER_ID);
    const noGeneration = setPendingRsvp("event-1", "DECLINED", USER_ID);

    const remoteGoing = event({
      GOING: [USER_ID, OTHER_ID],
      MAYBE: ["user-3"],
    });
    const merged = mergeEventWithPendingRsvp(remoteGoing, USER_ID);

    expect(merged.rsvps).toEqual({
      GOING: [OTHER_ID],
      MAYBE: ["user-3"],
      DECLINED: [USER_ID],
    });
    expect(isCurrentPendingRsvp("event-1", maybeGeneration)).toBe(false);
    expect(isCurrentPendingRsvp("event-1", noGeneration)).toBe(true);
  });

  it("does not let a stale generation clear a newer pending choice", () => {
    const goingGeneration = setPendingRsvp("event-1", "GOING", USER_ID);
    setPendingRsvp("event-1", "MAYBE", USER_ID);

    clearPendingRsvp("event-1", goingGeneration);

    expect(isCurrentPendingRsvp("event-1", goingGeneration)).toBe(false);
    expect(
      mergeEventWithPendingRsvp(event({ GOING: [USER_ID] }), USER_ID).rsvps
        .MAYBE,
    ).toEqual([USER_ID]);
  });

  it("uses the remote event once the current generation settles", () => {
    const generation = setPendingRsvp("event-1", "MAYBE", USER_ID);
    clearPendingRsvp("event-1", generation);

    const remote = event({ MAYBE: [USER_ID], GOING: [OTHER_ID] });
    expect(mergeEventWithPendingRsvp(remote, USER_ID)).toBe(remote);
  });

  it("does not overlay another user's pending RSVP", () => {
    setPendingRsvp("event-1", "DECLINED", "someone-else");
    const remote = event({ GOING: [USER_ID] });
    expect(mergeEventWithPendingRsvp(remote, USER_ID)).toBe(remote);
  });
});
