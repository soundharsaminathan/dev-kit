import {
  AttendanceStatus,
  BookingStatus,
  BookingType,
  MembershipStatus,
  SessionStatus,
} from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  batchHasScheduledSession,
  classifyStudentFunnelStage,
  countStudentFunnel,
  resolveStudentFunnelPeriod,
  type StudentFunnelStudentInput,
} from "./student-funnel";

function student(
  overrides: Partial<StudentFunnelStudentInput> = {},
): StudentFunnelStudentInput {
  return {
    id: "student-1",
    createdAt: new Date("2026-01-15T12:00:00.000Z"),
    enrollments: [],
    bookings: [],
    attendance: [],
    memberships: [],
    ...overrides,
  };
}

describe("student-funnel", () => {
  it("classifies active batch enrollment first", () => {
    expect(
      classifyStudentFunnelStage(
        student({
          enrollments: [
            {
              batchId: "batch-1",
              batchActive: true,
              hasScheduledSession: true,
              hasCompletedSession: false,
            },
          ],
          bookings: [
            {
              type: BookingType.TRIAL,
              status: BookingStatus.COMPLETED,
              sessionId: "session-1",
            },
          ],
        }),
      ),
    ).toBe("active");
  });

  it("classifies completed batch without active membership", () => {
    expect(
      classifyStudentFunnelStage(
        student({
          enrollments: [
            {
              batchId: "batch-1",
              batchActive: false,
              hasScheduledSession: false,
              hasCompletedSession: true,
            },
          ],
          memberships: [{ status: MembershipStatus.EXPIRED }],
        }),
      ),
    ).toBe("completedWithoutPlan");
  });

  it("does not treat finished batch as completed when membership is active", () => {
    expect(
      classifyStudentFunnelStage(
        student({
          enrollments: [
            {
              batchId: "batch-1",
              batchActive: false,
              hasScheduledSession: false,
              hasCompletedSession: true,
            },
          ],
          memberships: [{ status: MembershipStatus.ACTIVE }],
          bookings: [
            {
              type: BookingType.TRIAL,
              status: BookingStatus.COMPLETED,
              sessionId: "session-1",
            },
          ],
        }),
      ),
    ).toBe("trialAttended");
  });

  it("classifies trial attended via completed booking", () => {
    expect(
      classifyStudentFunnelStage(
        student({
          bookings: [
            {
              type: BookingType.TRIAL,
              status: BookingStatus.COMPLETED,
              sessionId: null,
            },
          ],
        }),
      ),
    ).toBe("trialAttended");
  });

  it("classifies trial attended via present attendance on trial session", () => {
    expect(
      classifyStudentFunnelStage(
        student({
          bookings: [
            {
              type: BookingType.TRIAL,
              status: BookingStatus.CONFIRMED,
              sessionId: "session-trial",
            },
          ],
          attendance: [
            {
              sessionId: "session-trial",
              status: AttendanceStatus.PRESENT,
            },
          ],
        }),
      ),
    ).toBe("trialAttended");
  });

  it("classifies trial registered without attendance", () => {
    expect(
      classifyStudentFunnelStage(
        student({
          bookings: [
            {
              type: BookingType.TRIAL,
              status: BookingStatus.PENDING,
              sessionId: "session-trial",
            },
          ],
        }),
      ),
    ).toBe("trialRegistered");
  });

  it("classifies signed-in only when nothing else happened", () => {
    expect(classifyStudentFunnelStage(student())).toBe("signedInOnly");
  });

  it("counts each stage across a studio cohort", () => {
    expect(
      countStudentFunnel([
        student({
          id: "a",
          enrollments: [
            {
              batchId: "batch-1",
              batchActive: true,
              hasScheduledSession: true,
              hasCompletedSession: false,
            },
          ],
        }),
        student({ id: "b" }),
        student({
          id: "c",
          bookings: [
            {
              type: BookingType.TRIAL,
              status: BookingStatus.PENDING,
              sessionId: null,
            },
          ],
        }),
        student({
          id: "d",
          bookings: [
            {
              type: BookingType.TRIAL,
              status: BookingStatus.COMPLETED,
              sessionId: null,
            },
          ],
        }),
        student({
          id: "e",
          enrollments: [
            {
              batchId: "batch-old",
              batchActive: false,
              hasScheduledSession: false,
              hasCompletedSession: true,
            },
          ],
        }),
      ]),
    ).toEqual({
      total: 5,
      active: 1,
      signedInOnly: 1,
      trialRegistered: 1,
      trialAttended: 1,
      completedWithoutPlan: 1,
      period: "lifetime",
    });
  });

  it("filters cohort by signup period", () => {
    const now = new Date("2026-07-22T12:00:00.000Z");
    const result = countStudentFunnel(
      [
        student({
          id: "old",
          createdAt: new Date("2026-01-10T00:00:00.000Z"),
        }),
        student({
          id: "july",
          createdAt: new Date("2026-07-05T00:00:00.000Z"),
          enrollments: [
            {
              batchId: "batch-1",
              batchActive: true,
              hasScheduledSession: true,
              hasCompletedSession: false,
            },
          ],
        }),
      ],
      "this_month",
      now,
    );

    expect(result).toEqual({
      total: 1,
      active: 1,
      signedInOnly: 0,
      trialRegistered: 0,
      trialAttended: 0,
      completedWithoutPlan: 0,
      period: "this_month",
    });
  });

  it("resolves last quarter and this year half bounds", () => {
    const now = new Date("2026-07-22T12:00:00.000Z");
    expect(resolveStudentFunnelPeriod("last_quarter", now)).toEqual({
      start: new Date("2026-04-01T00:00:00.000Z"),
      end: new Date("2026-07-01T00:00:00.000Z"),
    });
    expect(resolveStudentFunnelPeriod("this_year_half", now)).toEqual({
      start: new Date("2026-07-01T00:00:00.000Z"),
      end: now,
    });
  });

  it("detects scheduled sessions on a batch", () => {
    expect(
      batchHasScheduledSession([
        { status: SessionStatus.COMPLETED },
        { status: SessionStatus.SCHEDULED },
      ]),
    ).toBe(true);
    expect(
      batchHasScheduledSession([
        { status: SessionStatus.COMPLETED },
        { status: SessionStatus.CANCELLED },
      ]),
    ).toBe(false);
  });
});
