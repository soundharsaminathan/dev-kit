import { describe, expect, it } from "vitest";
import {
  buildJourneyEvents,
  buildJourneyStats,
  computeLongestStreak,
  markCurrentAndUpcoming,
  STREAK_MILESTONES,
  yearsBetween,
} from "./journey-events";

describe("journey-events", () => {
  const baseDate = new Date("2026-01-01T10:00:00.000Z");

  it("builds chronological events with joined, batch, attendance, and plan", () => {
    const events = buildJourneyEvents({
      joinedAt: baseDate,
      studioName: "Step Up",
      enrollments: [
        {
          id: "en-1",
          batchId: "b-1",
          enrolledAt: new Date("2026-01-05T10:00:00.000Z"),
          batchName: "Beginner Hip-Hop",
          coverImageUrl: null,
          trainers: [{ id: "t-1", name: "Asha", photoUrl: null }],
        },
      ],
      attendance: [
        {
          id: "a-1",
          sessionId: "s-1",
          startsAt: new Date("2026-01-10T10:00:00.000Z"),
          batchId: "b-1",
          batchName: "Beginner Hip-Hop",
        },
      ],
      memberships: [
        {
          id: "m-1",
          periodStart: new Date("2026-01-03T10:00:00.000Z"),
          subscriptionName: "Beginner Plan",
        },
      ],
      contests: [],
      certificates: [],
      achievements: [],
      ratings: [],
      experienceLevel: "BEGINNER",
    });

    expect(events.map((e) => e.kind)).toEqual([
      "JOINED",
      "PLAN",
      "BATCH",
      "LEVEL_UP",
      "TRAINER",
      "ATTENDANCE",
    ]);
    expect(events[0]?.title).toBe("Joined Step Up");
    expect(events.find((e) => e.kind === "TRAINER")?.trainer?.name).toBe(
      "Asha",
    );
  });

  it("emits streak milestones at thresholds", () => {
    const attendance = STREAK_MILESTONES[0]
      ? Array.from({ length: 7 }, (_, i) => {
          const startsAt = new Date(baseDate);
          startsAt.setUTCDate(startsAt.getUTCDate() + i);
          return {
            id: `a-${i}`,
            sessionId: `s-${i}`,
            startsAt,
            batchId: "b-1",
            batchName: "Batch A",
          };
        })
      : [];

    const events = buildJourneyEvents({
      joinedAt: baseDate,
      studioName: null,
      enrollments: [],
      attendance,
      memberships: [],
      contests: [],
      certificates: [],
      achievements: [],
      ratings: [],
      experienceLevel: null,
    });

    const streak = events.find((e) => e.kind === "ATTENDANCE_STREAK");
    expect(streak?.title).toBe("7-day streak");
    expect(streak?.meta?.streakDays).toBe(7);
  });

  it("marks the latest past event as current", () => {
    const raw = buildJourneyEvents({
      joinedAt: new Date("2026-01-01T00:00:00.000Z"),
      studioName: null,
      enrollments: [],
      attendance: [
        {
          id: "a-1",
          sessionId: "s-1",
          startsAt: new Date("2026-01-10T00:00:00.000Z"),
          batchId: "b-1",
          batchName: "Batch",
        },
      ],
      memberships: [],
      contests: [],
      certificates: [],
      achievements: [],
      ratings: [],
      experienceLevel: null,
    });

    const { events, currentEventId } = markCurrentAndUpcoming(
      raw,
      new Date("2026-01-15T00:00:00.000Z"),
    );
    expect(currentEventId).toBe("attendance-a-1");
    expect(events.find((e) => e.id === currentEventId)?.status).toBe("current");
    expect(events.find((e) => e.kind === "JOINED")?.status).toBe("completed");
  });

  it("computes longest streak across gaps", () => {
    expect(
      computeLongestStreak([
        { startsAt: new Date("2026-01-01T00:00:00.000Z") },
        { startsAt: new Date("2026-01-02T00:00:00.000Z") },
        { startsAt: new Date("2026-01-03T00:00:00.000Z") },
        { startsAt: new Date("2026-01-10T00:00:00.000Z") },
        { startsAt: new Date("2026-01-11T00:00:00.000Z") },
      ]),
    ).toBe(3);
  });

  it("builds stats with attendance percent and years", () => {
    const stats = buildJourneyStats({
      joinedAt: new Date("2024-01-01T00:00:00.000Z"),
      attendanceCount: 40,
      presentCount: 40,
      markedCount: 50,
      certificates: 2,
      competitions: 1,
      currentStreak: 3,
      longestStreak: 12,
      experienceLevel: "INTERMEDIATE",
      now: new Date("2026-01-01T00:00:00.000Z"),
    });
    expect(stats.attendancePercent).toBe(80);
    expect(stats.currentLevel).toBe("Intermediate");
    expect(stats.yearsLearning).toBe(2);
    expect(yearsBetween(new Date("2025-01-01"), new Date("2026-01-01"))).toBe(
      1,
    );
  });
});
