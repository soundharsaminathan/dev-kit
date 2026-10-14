import { describe, expect, it } from "vitest";
import {
  computeAttendanceStreak,
  computeBatchProgress,
  computeSessionsCompleted,
  toUtcDayKey,
} from "./home-stats";

describe("home-stats", () => {
  it("counts unique sessions completed", () => {
    const now = new Date("2026-07-21T12:00:00.000Z");
    expect(
      computeSessionsCompleted([
        { sessionId: "a", startsAt: now },
        { sessionId: "a", startsAt: now },
        { sessionId: "b", startsAt: now },
      ]),
    ).toBe(2);
  });

  it("computes consecutive attendance streak ending today", () => {
    const now = new Date("2026-07-21T15:00:00.000Z");
    const days = [0, 1, 2].map((offset) => {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - offset);
      return {
        sessionId: `s-${offset}`,
        startsAt: d,
      };
    });
    expect(computeAttendanceStreak(days, now)).toBe(3);
  });

  it("allows streak to continue from yesterday if no class today", () => {
    const now = new Date("2026-07-21T15:00:00.000Z");
    const yesterday = new Date(now);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const twoDaysAgo = new Date(now);
    twoDaysAgo.setUTCDate(twoDaysAgo.getUTCDate() - 2);
    expect(
      computeAttendanceStreak(
        [
          { sessionId: "1", startsAt: yesterday },
          { sessionId: "2", startsAt: twoDaysAgo },
        ],
        now,
      ),
    ).toBe(2);
  });

  it("returns zero streak when gap is larger than one day", () => {
    const now = new Date("2026-07-21T15:00:00.000Z");
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setUTCDate(threeDaysAgo.getUTCDate() - 3);
    expect(
      computeAttendanceStreak(
        [{ sessionId: "1", startsAt: threeDaysAgo }],
        now,
      ),
    ).toBe(0);
  });

  it("computes batch progress percent", () => {
    expect(
      computeBatchProgress({ totalSessions: 10, attendedSessions: 4 }),
    ).toEqual({
      totalSessions: 10,
      attendedSessions: 4,
      percent: 40,
    });
    expect(
      computeBatchProgress({ totalSessions: 0, attendedSessions: 2 }),
    ).toEqual({
      totalSessions: 0,
      attendedSessions: 0,
      percent: 0,
    });
  });

  it("formats utc day keys", () => {
    expect(toUtcDayKey(new Date("2026-07-21T23:30:00.000Z"))).toBe(
      "2026-07-21",
    );
  });
});
