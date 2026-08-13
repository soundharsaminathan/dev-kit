import { BadRequestException } from "@nestjs/common";
import {
  AttendanceStatus,
  BatchEnrollmentStatus,
  SessionStatus,
  SessionType,
} from "@prisma/client";
import { monthPeriodBounds } from "../home/home-stats";

const MONTH_KEY_RE = /^(\d{4})-(\d{2})$/;

export type AttendanceMonthSession = {
  id: string;
  startsAt: Date;
  type: SessionType;
  status: SessionStatus;
};

export type AttendanceMonthEnrollment = {
  studentId: string;
  enrolledAt: Date;
  status: BatchEnrollmentStatus;
  endedAt: Date | null;
};

export type AttendanceMonthMark = {
  sessionId: string;
  studentId: string;
  status: AttendanceStatus;
};

export type AttendanceMonthCounts = {
  studentId: string;
  eligibleCount: number;
  presentCount: number;
  absentCount: number;
  unmarkedCount: number;
};

export function parseAttendanceMonthKey(
  month: string | undefined,
  now = new Date(),
): { month: string; periodStart: Date; periodEnd: Date } {
  if (month == null || month === "") {
    const { periodStart, periodEnd } = monthPeriodBounds(now);
    const key = `${periodStart.getUTCFullYear()}-${String(periodStart.getUTCMonth() + 1).padStart(2, "0")}`;
    return { month: key, periodStart, periodEnd };
  }

  const match = MONTH_KEY_RE.exec(month);
  if (!match) {
    throw new BadRequestException("month must be YYYY-MM");
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(monthIndex) ||
    monthIndex < 0 ||
    monthIndex > 11
  ) {
    throw new BadRequestException("month must be YYYY-MM");
  }

  const periodStart = new Date(Date.UTC(year, monthIndex, 1));
  const periodEnd = new Date(Date.UTC(year, monthIndex + 1, 1));
  const key = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  return { month: key, periodStart, periodEnd };
}

/** Enrollment interval overlaps [periodStart, periodEnd). */
export function enrollmentOverlapsMonth(
  enrollment: Pick<
    AttendanceMonthEnrollment,
    "enrolledAt" | "status" | "endedAt"
  >,
  periodStart: Date,
  periodEnd: Date,
): boolean {
  if (enrollment.enrolledAt >= periodEnd) {
    return false;
  }

  if (enrollment.status === BatchEnrollmentStatus.ACTIVE) {
    return true;
  }

  if (enrollment.endedAt == null) {
    return false;
  }

  return enrollment.endedAt > periodStart;
}

export function isSessionEligibleForEnrollment(
  session: AttendanceMonthSession,
  enrollment: AttendanceMonthEnrollment,
): boolean {
  if (session.type !== SessionType.REGULAR) {
    return false;
  }
  if (session.status === SessionStatus.CANCELLED) {
    return false;
  }
  if (enrollment.status === BatchEnrollmentStatus.ACTIVE) {
    return true;
  }
  if (enrollment.endedAt == null) {
    return false;
  }
  return enrollment.endedAt > session.startsAt;
}

export function computeAttendanceMonthCounts(input: {
  enrollments: AttendanceMonthEnrollment[];
  sessions: AttendanceMonthSession[];
  marks: AttendanceMonthMark[];
  periodStart: Date;
  periodEnd: Date;
}): AttendanceMonthCounts[] {
  const monthSessions = input.sessions.filter(
    (session) =>
      session.type === SessionType.REGULAR &&
      session.status !== SessionStatus.CANCELLED &&
      session.startsAt >= input.periodStart &&
      session.startsAt < input.periodEnd,
  );

  const marksByStudentSession = new Map<string, AttendanceStatus>();
  for (const mark of input.marks) {
    marksByStudentSession.set(
      `${mark.studentId}:${mark.sessionId}`,
      mark.status,
    );
  }

  const overlapping = input.enrollments.filter((enrollment) =>
    enrollmentOverlapsMonth(enrollment, input.periodStart, input.periodEnd),
  );

  return overlapping.map((enrollment) => {
    let presentCount = 0;
    let absentCount = 0;
    let unmarkedCount = 0;
    let eligibleCount = 0;

    for (const session of monthSessions) {
      if (!isSessionEligibleForEnrollment(session, enrollment)) {
        continue;
      }
      eligibleCount += 1;
      const status = marksByStudentSession.get(
        `${enrollment.studentId}:${session.id}`,
      );
      if (status === AttendanceStatus.PRESENT) {
        presentCount += 1;
      } else if (status === AttendanceStatus.ABSENT) {
        absentCount += 1;
      } else {
        unmarkedCount += 1;
      }
    }

    return {
      studentId: enrollment.studentId,
      eligibleCount,
      presentCount,
      absentCount,
      unmarkedCount,
    };
  });
}

export function attendanceRate(present: number, eligible: number): number {
  if (eligible <= 0) return 0;
  return present / eligible;
}

export function compareAttendanceRisk(
  a: { presentCount: number; eligibleCount: number; name: string },
  b: { presentCount: number; eligibleCount: number; name: string },
): number {
  const rateDiff =
    attendanceRate(a.presentCount, a.eligibleCount) -
    attendanceRate(b.presentCount, b.eligibleCount);
  if (rateDiff !== 0) return rateDiff;
  return a.name.localeCompare(b.name);
}
