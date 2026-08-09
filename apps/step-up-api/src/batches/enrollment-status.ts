import { BatchEnrollmentStatus, type Prisma } from "@prisma/client";

export const ACTIVE_ENROLLMENT_WHERE = {
  status: BatchEnrollmentStatus.ACTIVE,
} satisfies Prisma.BatchEnrollmentWhereInput;

export const REACTIVATE_ENROLLMENT_DATA = {
  status: BatchEnrollmentStatus.ACTIVE,
  endedAt: null,
  endReason: null,
} satisfies Prisma.BatchEnrollmentUpdateInput;

export type InactiveEnrollmentReason = "MOVED" | "UNENROLLED";

export function inactiveReasonFromEndReason(
  endReason: string | null | undefined,
): InactiveEnrollmentReason {
  return endReason === "SWITCH" ? "MOVED" : "UNENROLLED";
}

export function endEnrollmentData(reason: string, at = new Date()) {
  return {
    status: BatchEnrollmentStatus.ENDED,
    endedAt: at,
    endReason: reason,
  } satisfies Prisma.BatchEnrollmentUpdateInput;
}

/** Enrollments that should appear on a session roster at `sessionStartsAt`. */
export function enrollmentVisibleAtSession(
  sessionStartsAt: Date,
): Prisma.BatchEnrollmentWhereInput {
  return {
    OR: [
      { status: BatchEnrollmentStatus.ACTIVE },
      {
        status: BatchEnrollmentStatus.ENDED,
        endedAt: { gt: sessionStartsAt },
      },
    ],
  };
}
