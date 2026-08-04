import { BadRequestException, ConflictException } from "@nestjs/common";
import { type Prisma, SessionStatus } from "@prisma/client";

/** Default trial length when callers omit an explicit count (student self-enroll). */
export const TRIAL_SESSION_LIMIT = 2;

/** Upper bound for staff-chosen trial session counts. */
export const MAX_TRIAL_SESSION_COUNT = 20;

export type TrialEnrollmentTx = {
  session: {
    findMany: (args: {
      where: Prisma.SessionWhereInput;
      orderBy: { startsAt: "asc" };
      take: number;
      select: { id: true };
    }) => Promise<Array<{ id: string }>>;
  };
};

export type TrialGuardTx = {
  batchEnrollment: {
    findFirst: (args: {
      where: Prisma.BatchEnrollmentWhereInput;
      select: { batchId: true; isTrial: true };
    }) => Promise<{ batchId: string; isTrial: boolean } | null>;
  };
};

export function parseTrialSessionIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is string => typeof id === "string");
}

export function enrollmentAllowsTrialSession(
  enrollment: { isTrial: boolean; trialSessionIds: unknown } | null | undefined,
  sessionId: string,
): boolean {
  if (!enrollment?.isTrial) return false;
  return parseTrialSessionIds(enrollment.trialSessionIds).includes(sessionId);
}

export async function resolveNextTrialSessionIds(
  tx: TrialEnrollmentTx,
  batchId: string,
  limit: number = TRIAL_SESSION_LIMIT,
): Promise<string[]> {
  const now = new Date();
  const sessions = await tx.session.findMany({
    where: {
      batchId,
      status: SessionStatus.SCHEDULED,
      startsAt: { gte: now },
    },
    orderBy: { startsAt: "asc" },
    take: limit,
    select: { id: true },
  });

  if (sessions.length === 0) {
    throw new BadRequestException(
      "No upcoming sessions available for a trial enrollment",
    );
  }

  return sessions.map((session) => session.id);
}

/** One student may hold at most one active trial (2 sessions) in a single batch. */
export async function assertStudentCanEnrollTrial(
  tx: TrialGuardTx,
  studentId: string,
  batchId: string,
): Promise<void> {
  const existingInBatch = await tx.batchEnrollment.findFirst({
    where: { studentId, batchId },
    select: { batchId: true, isTrial: true },
  });
  if (existingInBatch?.isTrial) {
    throw new ConflictException(
      "You are already enrolled in a trial for this class",
    );
  }
  if (existingInBatch) {
    throw new ConflictException("You are already enrolled in this class");
  }

  const otherTrial = await tx.batchEnrollment.findFirst({
    where: {
      studentId,
      isTrial: true,
      batchId: { not: batchId },
    },
    select: { batchId: true, isTrial: true },
  });
  if (otherTrial) {
    throw new ConflictException(
      "You already have an active trial in another class.",
    );
  }
}
