import { describe, expect, it } from "vitest";
import { adjacentSessions } from "./adjacent-sessions";

const sessions = [
  { id: "a", startsAt: "2026-09-01T10:00:00.000Z" },
  { id: "b", startsAt: "2026-09-08T10:00:00.000Z" },
  { id: "c", startsAt: "2026-09-15T10:00:00.000Z" },
];

describe("adjacentSessions", () => {
  it("returns both neighbors for a middle session", () => {
    expect(adjacentSessions(sessions, "b")).toEqual({
      previousId: "a",
      nextId: "c",
    });
  });

  it("disables previous on the first session", () => {
    expect(adjacentSessions(sessions, "a")).toEqual({
      previousId: null,
      nextId: "b",
    });
  });

  it("disables next on the last session", () => {
    expect(adjacentSessions(sessions, "c")).toEqual({
      previousId: "b",
      nextId: null,
    });
  });

  it("returns no neighbors when the current session is missing", () => {
    expect(adjacentSessions(sessions, "missing")).toEqual({
      previousId: null,
      nextId: null,
    });
  });

  it("sorts by start time even when the list is unordered", () => {
    expect(adjacentSessions([...sessions].reverse(), "b")).toEqual({
      previousId: "a",
      nextId: "c",
    });
  });

  it("uses id as a tiebreaker when start times match", () => {
    expect(
      adjacentSessions(
        [
          { id: "z", startsAt: "2026-09-08T10:00:00.000Z" },
          { id: "a", startsAt: "2026-09-08T10:00:00.000Z" },
          { id: "m", startsAt: "2026-09-08T10:00:00.000Z" },
        ],
        "m",
      ),
    ).toEqual({
      previousId: "a",
      nextId: "z",
    });
  });
});
