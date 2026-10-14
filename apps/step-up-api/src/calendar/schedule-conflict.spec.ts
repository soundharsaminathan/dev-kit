import { describe, expect, it } from "vitest";
import {
  collapseWindow,
  conflictMessage,
  findScheduleConflict,
  formatConflictInstant,
  intervalsOverlap,
  type OccupancySlot,
  type TimeInterval,
} from "./schedule-conflict";

const interval = (start: string, end: string): TimeInterval => ({
  startsAt: new Date(start),
  endsAt: new Date(end),
});

const slot = (overrides: Partial<OccupancySlot> = {}): OccupancySlot => ({
  kind: "session",
  id: "occ-1",
  startsAt: new Date("2026-07-20T10:00:00.000Z"),
  endsAt: new Date("2026-07-20T11:00:00.000Z"),
  trainerIds: ["trainer-1"],
  studentIds: ["student-1"],
  branchId: "branch-1",
  ...overrides,
});

describe("intervalsOverlap", () => {
  it("detects overlapping ranges", () => {
    expect(
      intervalsOverlap(
        interval("2026-07-20T10:00:00.000Z", "2026-07-20T11:00:00.000Z"),
        interval("2026-07-20T10:30:00.000Z", "2026-07-20T11:30:00.000Z"),
      ),
    ).toBe(true);
  });

  it("treats touching endpoints as non-overlapping", () => {
    expect(
      intervalsOverlap(
        interval("2026-07-20T10:00:00.000Z", "2026-07-20T11:00:00.000Z"),
        interval("2026-07-20T11:00:00.000Z", "2026-07-20T12:00:00.000Z"),
      ),
    ).toBe(false);
  });
});

describe("collapseWindow", () => {
  it("returns null for empty input", () => {
    expect(collapseWindow([])).toBeNull();
  });

  it("spans all intervals", () => {
    expect(
      collapseWindow([
        interval("2026-07-20T10:00:00.000Z", "2026-07-20T11:00:00.000Z"),
        interval("2026-07-22T14:00:00.000Z", "2026-07-22T15:00:00.000Z"),
      ]),
    ).toEqual(interval("2026-07-20T10:00:00.000Z", "2026-07-22T15:00:00.000Z"));
  });
});

describe("formatConflictInstant", () => {
  it("formats in the requested local timezone", () => {
    expect(
      formatConflictInstant(
        new Date("2026-07-20T10:00:00.000Z"),
        "Asia/Kolkata",
      ),
    ).toBe("20 Jul 2026, 3:30 pm");
  });
});

describe("findScheduleConflict", () => {
  const proposed = [
    interval("2026-07-20T10:00:00.000Z", "2026-07-20T11:00:00.000Z"),
  ];

  it("reports branch conflicts first when branch overlaps", () => {
    const conflict = findScheduleConflict(proposed, [slot()], {
      trainerIds: ["trainer-1"],
      studentIds: ["student-1"],
      branchId: "branch-1",
    });
    expect(conflict?.party).toBe("branch");
    expect(conflictMessage(conflict!, "Asia/Kolkata")).toBe(
      "Branch already has a class at 20 Jul 2026, 3:30 pm",
    );
  });

  it("reports trainer conflicts", () => {
    const conflict = findScheduleConflict(
      proposed,
      [slot({ branchId: "branch-other" })],
      { trainerIds: ["trainer-1"] },
    );
    expect(conflict?.party).toBe("trainer");
    expect(conflictMessage(conflict!)).toContain("Trainer is already booked");
  });

  it("reports student conflicts", () => {
    const conflict = findScheduleConflict(
      proposed,
      [slot({ branchId: "branch-other", trainerIds: [] })],
      { studentIds: ["student-1"] },
    );
    expect(conflict?.party).toBe("student");
    expect(conflictMessage(conflict!)).toContain("Student has another class");
  });

  it("returns null when nothing overlaps", () => {
    expect(
      findScheduleConflict(
        [interval("2026-07-20T12:00:00.000Z", "2026-07-20T13:00:00.000Z")],
        [slot()],
        {
          trainerIds: ["trainer-1"],
          studentIds: ["student-1"],
          branchId: "branch-1",
        },
      ),
    ).toBeNull();
  });
});
