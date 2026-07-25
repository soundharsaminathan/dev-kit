import { BadRequestException } from "@nestjs/common";
import { type Prisma, SessionStatus } from "@prisma/client";

export const TRIAL_SESSION_LIMIT = 2;

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
