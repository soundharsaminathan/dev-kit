import { BadRequestException } from "@nestjs/common";
import {
  AttendanceStatus,
  BatchEnrollmentStatus,
  SessionStatus,
  SessionType,
} from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  compareAttendanceRisk,
  computeAttendanceMonthCounts,
  enrollmentOverlapsMonth,
  isSessionEligibleForEnrollment,
  parseAttendanceMonthKey,
} from "./attendance-month";

const periodStart = new Date(Date.UTC(2026, 7, 1));
const periodEnd = new Date(Date.UTC(2026, 8, 1));

function session(
  id: string,
  day: number,
  opts?: { type?: SessionType; status?: SessionStatus },
) {
  return {
    id,
    startsAt: new Date(Date.UTC(2026, 7, day, 10, 0)),
    type: opts?.type ?? SessionType.REGULAR,
    status: opts?.status ?? SessionStatus.SCHEDULED,
  };
}

describe("parseAttendanceMonthKey", () => {
  it("defaults to current UTC month when omitted", () => {
    const now = new Date(Date.UTC(2026, 7, 14));
    const result = parseAttendanceMonthKey(undefined, now);
    expect(result.month).toBe("2026-08");
    expect(result.periodStart).toEqual(periodStart);
    expect(result.periodEnd).toEqual(periodEnd);
  });

  it("parses a valid YYYY-MM", () => {
    const result = parseAttendanceMonthKey("2026-08");
    expect(result.month).toBe("2026-08");
    expect(result.periodStart).toEqual(periodStart);
    expect(result.periodEnd).toEqual(periodEnd);
  });

  it("rejects invalid month keys", () => {
    expect(() => parseAttendanceMonthKey("2026-13")).toThrow(
      BadRequestException,
    );
    expect(() => parseAttendanceMonthKey("August")).toThrow(
      BadRequestException,
    );
    expect(() => parseAttendanceMonthKey("2026/08")).toThrow(
      BadRequestException,
    );
  });
});

describe("enrollmentOverlapsMonth", () => {
  it("includes active enrollments that started before month end", () => {
    expect(
      enrollmentOverlapsMonth(
        {
          enrolledAt: new Date(Date.UTC(2026, 6, 15)),
          status: BatchEnrollmentStatus.ACTIVE,
          endedAt: null,
        },
        periodStart,
        periodEnd,
      ),
    ).toBe(true);
  });

  it("excludes enrollments that start after the month", () => {
    expect(
      enrollmentOverlapsMonth(
        {
          enrolledAt: new Date(Date.UTC(2026, 8, 1)),
          status: BatchEnrollmentStatus.ACTIVE,
          endedAt: null,
        },
        periodStart,
        periodEnd,
      ),
    ).toBe(false);
  });

  it("includes ended enrollments that ended after month start", () => {
    expect(
      enrollmentOverlapsMonth(
        {
          enrolledAt: new Date(Date.UTC(2026, 6, 1)),
          status: BatchEnrollmentStatus.ENDED,
          endedAt: new Date(Date.UTC(2026, 7, 15)),
        },
        periodStart,
        periodEnd,
      ),
    ).toBe(true);
  });

  it("excludes ended enrollments that ended before the month", () => {
    expect(
      enrollmentOverlapsMonth(
        {
          enrolledAt: new Date(Date.UTC(2026, 5, 1)),
          status: BatchEnrollmentStatus.ENDED,
          endedAt: new Date(Date.UTC(2026, 6, 31)),
        },
        periodStart,
        periodEnd,
      ),
    ).toBe(false);
  });
});

describe("isSessionEligibleForEnrollment", () => {
  it("excludes cancelled and trial sessions", () => {
    const enrollment = {
      studentId: "s1",
      enrolledAt: new Date(Date.UTC(2026, 6, 1)),
      status: BatchEnrollmentStatus.ACTIVE,
      endedAt: null,
    };
    expect(
      isSessionEligibleForEnrollment(
        session("c", 5, { status: SessionStatus.CANCELLED }),
        enrollment,
      ),
    ).toBe(false);
    expect(
      isSessionEligibleForEnrollment(
        session("t", 5, { type: SessionType.TRIAL }),
        enrollment,
      ),
    ).toBe(false);
  });

  it("only counts sessions before mid-month unenroll", () => {
    const enrollment = {
      studentId: "s1",
      enrolledAt: new Date(Date.UTC(2026, 6, 1)),
      status: BatchEnrollmentStatus.ENDED,
      endedAt: new Date(Date.UTC(2026, 7, 15, 12, 0)),
    };
    expect(isSessionEligibleForEnrollment(session("a", 10), enrollment)).toBe(
      true,
    );
    expect(isSessionEligibleForEnrollment(session("b", 20), enrollment)).toBe(
      false,
    );
  });
});

describe("computeAttendanceMonthCounts", () => {
  it("counts present/absent/unmarked for overlapping students only", () => {
    const sessions = [
      session("s1", 3),
      session("s2", 10),
      session("s3", 17),
      session("s4", 24),
      session("cancelled", 5, { status: SessionStatus.CANCELLED }),
      session("trial", 12, { type: SessionType.TRIAL }),
    ];

    const enrollments = [
      {
        studentId: "active",
        enrolledAt: new Date(Date.UTC(2026, 6, 1)),
        status: BatchEnrollmentStatus.ACTIVE,
        endedAt: null,
      },
      {
        studentId: "left-mid",
        enrolledAt: new Date(Date.UTC(2026, 6, 1)),
        status: BatchEnrollmentStatus.ENDED,
        endedAt: new Date(Date.UTC(2026, 7, 12, 0, 0)),
      },
      {
        studentId: "after-month",
        enrolledAt: new Date(Date.UTC(2026, 8, 2)),
        status: BatchEnrollmentStatus.ACTIVE,
        endedAt: null,
      },
      {
        studentId: "unpaid-still-listed",
        enrolledAt: new Date(Date.UTC(2026, 7, 1)),
        status: BatchEnrollmentStatus.ACTIVE,
        endedAt: null,
      },
    ];

    const marks = [
      {
        sessionId: "s1",
        studentId: "active",
        status: AttendanceStatus.PRESENT,
      },
      {
        sessionId: "s2",
        studentId: "active",
        status: AttendanceStatus.PRESENT,
      },
      {
        sessionId: "s3",
        studentId: "active",
        status: AttendanceStatus.ABSENT,
      },
      {
        sessionId: "s1",
        studentId: "left-mid",
        status: AttendanceStatus.PRESENT,
      },
      {
        sessionId: "s1",
        studentId: "unpaid-still-listed",
        status: AttendanceStatus.PRESENT,
      },
    ];

    const rows = computeAttendanceMonthCounts({
      enrollments,
      sessions,
      marks,
      periodStart,
      periodEnd,
    });

    const byId = Object.fromEntries(rows.map((row) => [row.studentId, row]));

    expect(byId["after-month"]).toBeUndefined();
    expect(Object.keys(byId).sort()).toEqual([
      "active",
      "left-mid",
      "unpaid-still-listed",
    ]);

    expect(byId.active).toEqual({
      studentId: "active",
      eligibleCount: 4,
      presentCount: 2,
      absentCount: 1,
      unmarkedCount: 1,
    });

    expect(byId["left-mid"]).toEqual({
      studentId: "left-mid",
      eligibleCount: 2,
      presentCount: 1,
      absentCount: 0,
      unmarkedCount: 1,
    });

    expect(byId["unpaid-still-listed"]?.eligibleCount).toBe(4);
    expect(byId["unpaid-still-listed"]?.presentCount).toBe(1);
  });
});

describe("compareAttendanceRisk", () => {
  it("sorts lowest rate first then name", () => {
    const rows = [
      { presentCount: 8, eligibleCount: 10, name: "Zed" },
      { presentCount: 2, eligibleCount: 10, name: "Ann" },
      { presentCount: 2, eligibleCount: 10, name: "Bob" },
    ];
    rows.sort(compareAttendanceRisk);
    expect(rows.map((row) => row.name)).toEqual(["Ann", "Bob", "Zed"]);
  });
});
