import {
  AttendanceStatus,
  BookingStatus,
  BookingType,
  MembershipStatus,
  SessionStatus,
} from "@prisma/client";

export type StudentFunnelStage =
  | "active"
  | "signedInOnly"
  | "trialAttended"
  | "completedWithoutPlan";

export type StudentFunnelPeriod =
  | "lifetime"
  | "this_month"
  | "last_quarter"
  | "this_year_half"
  | "this_year";

export const STUDENT_FUNNEL_PERIODS: StudentFunnelPeriod[] = [
  "lifetime",
  "this_month",
  "last_quarter",
  "this_year_half",
  "this_year",
];

export type StudentFunnelCounts = Record<StudentFunnelStage, number> & {
  total: number;
  period: StudentFunnelPeriod;
};

export type StudentFunnelEnrollmentInput = {
  batchId: string;
  batchActive: boolean;
  enrollmentActive: boolean;
  hasScheduledSession: boolean;
  hasCompletedSession: boolean;
};

export type StudentFunnelBookingInput = {
  type: BookingType;
  status: BookingStatus;
  sessionId: string | null;
};

export type StudentFunnelAttendanceInput = {
  sessionId: string;
  status: AttendanceStatus;
};

export type StudentFunnelMembershipInput = {
  status: MembershipStatus;
};

export type StudentFunnelStudentInput = {
  id: string;
  createdAt: Date;
  enrollments: StudentFunnelEnrollmentInput[];
  bookings: StudentFunnelBookingInput[];
  attendance: StudentFunnelAttendanceInput[];
  memberships: StudentFunnelMembershipInput[];
};

export type DateRange = {
  start: Date | null;
  end: Date | null;
};

const EMPTY_COUNTS = {
  total: 0,
  active: 0,
  signedInOnly: 0,
  trialAttended: 0,
  completedWithoutPlan: 0,
} as const;

export const STUDENT_FUNNEL_STAGES: StudentFunnelStage[] = [
  "active",
  "signedInOnly",
  "trialAttended",
  "completedWithoutPlan",
];

export function isStudentFunnelPeriod(
  value: string | undefined,
): value is StudentFunnelPeriod {
  return (
    value !== undefined && (STUDENT_FUNNEL_PERIODS as string[]).includes(value)
  );
}

export function isStudentFunnelStage(
  value: string | undefined,
): value is StudentFunnelStage {
  return (
    value !== undefined && (STUDENT_FUNNEL_STAGES as string[]).includes(value)
  );
}

export function resolveStudentFunnelPeriod(
  period: StudentFunnelPeriod,
  now = new Date(),
): DateRange {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  switch (period) {
    case "lifetime":
      return { start: null, end: null };
    case "this_month":
      return {
        start: new Date(Date.UTC(year, month, 1)),
        end: now,
      };
    case "last_quarter": {
      const currentQuarter = Math.floor(month / 3);
      const lastQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
      const lastQuarterYear = currentQuarter === 0 ? year - 1 : year;
      return {
        start: new Date(Date.UTC(lastQuarterYear, lastQuarter * 3, 1)),
        end: new Date(Date.UTC(lastQuarterYear, lastQuarter * 3 + 3, 1)),
      };
    }
    case "this_year_half": {
      const halfStartMonth = month < 6 ? 0 : 6;
      return {
        start: new Date(Date.UTC(year, halfStartMonth, 1)),
        end: now,
      };
    }
    case "this_year":
      return {
        start: new Date(Date.UTC(year, 0, 1)),
        end: now,
      };
  }
}

export function isDateInRange(date: Date, range: DateRange): boolean {
  if (range.start && date < range.start) {
    return false;
  }
  if (range.end && date >= range.end) {
    return false;
  }
  return true;
}

function hasActiveBatchEnrollment(
  enrollments: StudentFunnelEnrollmentInput[],
): boolean {
  return enrollments.some(
    (enrollment) => enrollment.enrollmentActive && enrollment.batchActive,
  );
}

function hasCompletedBatchWithoutActiveMembership(
  enrollments: StudentFunnelEnrollmentInput[],
  memberships: StudentFunnelMembershipInput[],
): boolean {
  const hasActiveMembership = memberships.some(
    (membership) => membership.status === MembershipStatus.ACTIVE,
  );
  if (hasActiveMembership) {
    return false;
  }

  return enrollments.some(
    (enrollment) =>
      !enrollment.batchActive ||
      (!enrollment.hasScheduledSession && enrollment.hasCompletedSession),
  );
}

function trialSessionIdsFromBookings(
  bookings: StudentFunnelBookingInput[],
): Set<string> {
  const ids = new Set<string>();
  for (const booking of bookings) {
    if (
      booking.type === BookingType.TRIAL &&
      booking.status !== BookingStatus.CANCELLED &&
      booking.status !== BookingStatus.AWAITING_PAYMENT &&
      booking.sessionId
    ) {
      ids.add(booking.sessionId);
    }
  }
  return ids;
}

function hasTrialAttendance(
  bookings: StudentFunnelBookingInput[],
  attendance: StudentFunnelAttendanceInput[],
): boolean {
  const completedTrial = bookings.some(
    (booking) =>
      booking.type === BookingType.TRIAL &&
      booking.status === BookingStatus.COMPLETED,
  );
  if (completedTrial) {
    return true;
  }

  const trialSessions = trialSessionIdsFromBookings(bookings);
  return attendance.some(
    (record) =>
      record.status === AttendanceStatus.PRESENT &&
      trialSessions.has(record.sessionId),
  );
}

export function classifyStudentFunnelStage(
  student: StudentFunnelStudentInput,
): StudentFunnelStage {
  if (hasActiveBatchEnrollment(student.enrollments)) {
    return "active";
  }

  if (
    hasCompletedBatchWithoutActiveMembership(
      student.enrollments,
      student.memberships,
    )
  ) {
    return "completedWithoutPlan";
  }

  if (hasTrialAttendance(student.bookings, student.attendance)) {
    return "trialAttended";
  }

  return "signedInOnly";
}

export function countStudentFunnel(
  students: StudentFunnelStudentInput[],
  period: StudentFunnelPeriod = "lifetime",
  now = new Date(),
): StudentFunnelCounts {
  const range = resolveStudentFunnelPeriod(period, now);
  const cohort = students.filter((student) =>
    isDateInRange(student.createdAt, range),
  );
  const counts: StudentFunnelCounts = {
    ...EMPTY_COUNTS,
    total: cohort.length,
    period,
  };

  for (const student of cohort) {
    counts[classifyStudentFunnelStage(student)] += 1;
  }

  return counts;
}

export function batchHasScheduledSession(
  sessions: Array<{ status: SessionStatus }>,
): boolean {
  return sessions.some((session) => session.status === SessionStatus.SCHEDULED);
}

export function batchHasCompletedSession(
  sessions: Array<{ status: SessionStatus }>,
): boolean {
  return sessions.some((session) => session.status === SessionStatus.COMPLETED);
}
