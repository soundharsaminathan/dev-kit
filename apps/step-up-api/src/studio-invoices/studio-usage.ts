import {
  BatchEnrollmentStatus,
  SessionStatus,
  UserRole,
  type PrismaClient,
} from "@prisma/client";
import { zonedLocalToUtc } from "../common/zoned-local-time";

export const STUDIO_PLAN_AMOUNTS = {
  BASIC: 999,
  ADVANCED: 1499,
} as const;

export const BASIC_PLAN_CAPS = {
  activeStudents: 200,
  batches: 10,
  trainers: 3,
  staff: 1,
} as const;

export type StudioPlanKey = keyof typeof STUDIO_PLAN_AMOUNTS;

export type StudioUsageCounts = {
  activeStudents: number;
  trainers: number;
  staff: number;
  batches: number;
  sessionsThisMonth: number;
};

export type StudioUsageResult = StudioUsageCounts & {
  month: string;
  periodStart: string;
  periodEnd: string;
  timezone: string;
  suggestedPlan: StudioPlanKey;
  suggestedAmount: number;
};

const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;
const DEFAULT_TIMEZONE = "Asia/Kolkata";

export function listAmountForPlan(plan: StudioPlanKey): number {
  return STUDIO_PLAN_AMOUNTS[plan];
}

export function suggestPlan(counts: StudioUsageCounts): StudioPlanKey {
  if (
    counts.activeStudents > BASIC_PLAN_CAPS.activeStudents ||
    counts.batches > BASIC_PLAN_CAPS.batches ||
    counts.trainers > BASIC_PLAN_CAPS.trainers ||
    counts.staff > BASIC_PLAN_CAPS.staff
  ) {
    return "ADVANCED";
  }
  return "BASIC";
}

export function payableAmount(listAmount: number, discount: number): number {
  return Math.max(0, Math.round((listAmount - discount) * 100) / 100);
}

/** Parse `YYYY-MM` into inclusive UTC bounds for that calendar month in `timeZone`. */
export function monthBounds(
  month: string,
  timeZone: string,
): { periodStart: Date; periodEnd: Date; month: string } {
  const match = MONTH_PATTERN.exec(month.trim());
  if (!match) {
    throw new Error(`Invalid month: ${month}`);
  }
  const year = Number(match[1]);
  const monthNum = Number(match[2]);
  if (monthNum < 1 || monthNum > 12) {
    throw new Error(`Invalid month: ${month}`);
  }
  const normalized = `${match[1]}-${match[2]}`;
  const periodStart = zonedLocalToUtc(`${normalized}-01`, "00:00", timeZone);
  const nextMonth =
    monthNum === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(monthNum + 1).padStart(2, "0")}-01`;
  const nextStart = zonedLocalToUtc(nextMonth, "00:00", timeZone);
  const periodEnd = new Date(nextStart.getTime() - 1);
  return { periodStart, periodEnd, month: normalized };
}

export function currentMonthKey(timeZone: string, at = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZone.trim() || DEFAULT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(at);
  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  return `${year}-${month}`;
}

export async function getStudioTimezone(
  prisma: PrismaClient,
  studioId: string,
): Promise<string> {
  const settings = await prisma.studioSettings.findUnique({
    where: { studioId },
    select: { timezone: true },
  });
  return settings?.timezone?.trim() || DEFAULT_TIMEZONE;
}

export async function countStudioUsage(
  prisma: PrismaClient,
  studioId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<StudioUsageCounts> {
  const [activeStudents, trainers, staff, batches, sessionsThisMonth] =
    await Promise.all([
      prisma.batchEnrollment.findMany({
        where: {
          status: BatchEnrollmentStatus.ACTIVE,
          batch: { studioId, active: true },
        },
        select: { studentId: true },
        distinct: ["studentId"],
      }),
      prisma.user.count({
        where: { studioId, role: UserRole.TRAINER },
      }),
      prisma.user.count({
        where: { studioId, role: UserRole.STAFF },
      }),
      prisma.batch.count({
        where: { studioId, active: true },
      }),
      prisma.session.count({
        where: {
          status: { not: SessionStatus.CANCELLED },
          startsAt: { gte: periodStart, lte: periodEnd },
          batch: { studioId },
        },
      }),
    ]);

  return {
    activeStudents: activeStudents.length,
    trainers,
    staff,
    batches,
    sessionsThisMonth,
  };
}

export async function getStudioUsage(
  prisma: PrismaClient,
  studioId: string,
  month?: string | null,
): Promise<StudioUsageResult> {
  const timezone = await getStudioTimezone(prisma, studioId);
  const monthKey = month?.trim()
    ? month.trim()
    : currentMonthKey(timezone);
  const { periodStart, periodEnd, month: normalized } = monthBounds(
    monthKey,
    timezone,
  );
  const counts = await countStudioUsage(
    prisma,
    studioId,
    periodStart,
    periodEnd,
  );
  const suggestedPlan = suggestPlan(counts);
  return {
    ...counts,
    month: normalized,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    timezone,
    suggestedPlan,
    suggestedAmount: listAmountForPlan(suggestedPlan),
  };
}

export async function getStudioUsageSummaries(
  prisma: PrismaClient,
  studioIds: string[],
  at = new Date(),
): Promise<
  Map<
    string,
    {
      activeStudents: number;
      trainers: number;
      sessionsThisMonth: number;
    }
  >
> {
  const result = new Map<
    string,
    {
      activeStudents: number;
      trainers: number;
      sessionsThisMonth: number;
    }
  >();
  if (studioIds.length === 0) {
    return result;
  }

  await Promise.all(
    studioIds.map(async (studioId) => {
      const timezone = await getStudioTimezone(prisma, studioId);
      const monthKey = currentMonthKey(timezone, at);
      const { periodStart, periodEnd } = monthBounds(monthKey, timezone);
      const counts = await countStudioUsage(
        prisma,
        studioId,
        periodStart,
        periodEnd,
      );
      result.set(studioId, {
        activeStudents: counts.activeStudents,
        trainers: counts.trainers,
        sessionsThisMonth: counts.sessionsThisMonth,
      });
    }),
  );

  return result;
}
