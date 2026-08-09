import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { MediaService } from "../media/media.service";
import { PrismaService } from "../prisma/prisma.service";
import type { DecryptedUser } from "../users/user-crypto.service";
import { UserCryptoService } from "../users/user-crypto.service";
import { AchievementsService } from "./achievements.service";
import { GoalsService } from "./goals.service";
import {
  computeAttendanceStreak,
  computeBatchProgress,
  computeSessionsCompleted,
  monthPeriodBounds,
} from "./home-stats";

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function greetingFor(now: Date) {
  const hour = now.getUTCHours();
  if (hour < 12) return "Morning";
  if (hour < 17) return "Hey";
  return "Night owl";
}

function styleBadgeFromCategories(danceCategories: unknown): string | null {
  if (!Array.isArray(danceCategories) || !danceCategories[0]) return null;
  const name = String(
    (danceCategories[0] as { name?: string }).name ?? "",
  ).trim();
  return name || null;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function scheduleLabelFrom(schedule: unknown): string | null {
  if (!schedule || typeof schedule !== "object") return null;
  const s = schedule as {
    frequency?: string;
    weekdays?: number[];
    startTime?: string;
    endTime?: string;
  };
  if (!s.startTime || !s.endTime) return null;
  if (s.frequency === "DAILY") {
    return `Daily · ${s.startTime}–${s.endTime}`;
  }
  const days = (s.weekdays ?? [])
    .map((day) => WEEKDAY_LABELS[day] ?? "")
    .filter(Boolean)
    .join(", ");
  return days
    ? `${days} · ${s.startTime}–${s.endTime}`
    : `${s.startTime}–${s.endTime}`;
}

const WEEKEND_DAYS = new Set([0, 6]);
const WEEKDAY_DAYS = new Set([1, 2, 3, 4, 5]);

function scheduleVibeScore(scheduleJson: unknown, vibes: string[]): number {
  if (!vibes.length || !scheduleJson || typeof scheduleJson !== "object") {
    return 0;
  }
  const schedule = scheduleJson as {
    weekdays?: number[];
    startTime?: string;
    frequency?: string;
  };
  const days =
    schedule.frequency === "DAILY"
      ? [0, 1, 2, 3, 4, 5, 6]
      : (schedule.weekdays ?? []);
  const startHour = schedule.startTime
    ? Number(schedule.startTime.slice(0, 2))
    : null;
  let score = 0;
  for (const vibe of vibes) {
    if (vibe === "flexible") {
      score += 1;
      continue;
    }
    if (vibe === "weekends" && days.some((day) => WEEKEND_DAYS.has(day))) {
      score += 2;
    }
    if (
      vibe === "weekday_evenings" &&
      days.some((day) => WEEKDAY_DAYS.has(day)) &&
      startHour != null &&
      startHour >= 17
    ) {
      score += 2;
    }
    if (vibe === "mornings" && startHour != null && startHour < 12) {
      score += 2;
    }
  }
  return score;
}

@Injectable()
export class HomeService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(UserCryptoService) private readonly crypto: UserCryptoService,
    @Inject(MediaService) private readonly media: MediaService,
    @Inject(GoalsService) private readonly goals: GoalsService,
    @Inject(AchievementsService)
    private readonly achievements: AchievementsService,
  ) {}

  private async resolveStudentId(actor: DecryptedUser, studentId?: string) {
    const targetId = studentId?.trim() || actor.id;

    if (targetId === actor.id) {
      if (actor.role !== UserRole.STUDENT && actor.role !== UserRole.PARENT) {
        throw new ForbiddenException("Home is only available to members");
      }
      return targetId;
    }

    if (actor.role !== UserRole.PARENT) {
      throw new ForbiddenException("You can only view your own home");
    }

    const link = await this.prisma.parentChild.findUnique({
      where: {
        parentUserId_childUserId: {
          parentUserId: actor.id,
          childUserId: targetId,
        },
      },
    });
    if (!link) {
      throw new ForbiddenException("Child not linked to this parent");
    }
    return targetId;
  }

  async getHome(actor: DecryptedUser, studentId?: string) {
    const resolvedStudentId = await this.resolveStudentId(actor, studentId);
    const student = await this.prisma.user.findUnique({
      where: { id: resolvedStudentId },
    });
    if (!student) {
      throw new NotFoundException("Student not found");
    }

    const decrypted = this.crypto.decryptUser(student);
    const studioId = student.studioId;
    const now = new Date();
    const todayStart = startOfUtcDay(now);
    const todayEnd = new Date(todayStart.getTime() + 86_400_000);
    const weekEnd = new Date(todayStart.getTime() + 7 * 86_400_000);
    const { periodStart, periodEnd } = monthPeriodBounds(now);

    const [
      membershipRows,
      presentAttendance,
      enrollments,
      upcomingSessions,
      todayBookings,
      studio,
      contestEntries,
      contests,
      notificationsUnread,
      feedPeek,
      goal,
    ] = await Promise.all([
      this.prisma.membership.findMany({
        where: {
          OR: [
            { purchaserUserId: resolvedStudentId },
            { coveredStudents: { some: { studentId: resolvedStudentId } } },
          ],
        },
        include: { subscription: true },
        orderBy: { periodStart: "desc" },
        take: 5,
      }),
      this.prisma.attendance.findMany({
        where: {
          studentId: resolvedStudentId,
          status: "PRESENT",
        },
        include: {
          session: { select: { id: true, startsAt: true, batchId: true } },
        },
      }),
      this.prisma.batchEnrollment.findMany({
        where: {
          studentId: resolvedStudentId,
          status: "ACTIVE",
          batch: { active: true },
        },
        include: {
          batch: {
            include: {
              sessions: {
                where: {
                  status: "SCHEDULED",
                  startsAt: { gt: now },
                },
                select: {
                  id: true,
                  startsAt: true,
                  endsAt: true,
                  status: true,
                },
                orderBy: { startsAt: "asc" },
                take: 1,
              },
              branch: { select: { id: true, name: true } },
              _count: { select: { sessions: true } },
            },
          },
        },
      }),
      this.prisma.session.findMany({
        where: {
          status: "SCHEDULED",
          startsAt: { gte: todayStart, lt: weekEnd },
          batch: {
            active: true,
            enrollments: {
              some: { studentId: resolvedStudentId, status: "ACTIVE" },
            },
          },
        },
        include: {
          batch: {
            select: {
              id: true,
              name: true,
              coverImageUrl: true,
              danceCategories: true,
              branch: { select: { id: true, name: true } },
            },
          },
          attendance: {
            where: { studentId: resolvedStudentId },
            select: { status: true },
            take: 1,
          },
        },
        orderBy: { startsAt: "asc" },
        take: 12,
      }),
      this.prisma.booking.findMany({
        where: {
          studentId: resolvedStudentId,
          status: "CONFIRMED",
          OR: [
            {
              sessionId: { not: null },
              session: {
                startsAt: { gte: todayStart, lt: weekEnd },
              },
            },
            {
              sessionId: null,
              startsAt: { not: null, gte: todayStart, lt: weekEnd },
            },
          ],
        },
        include: {
          batch: { select: { id: true, name: true, coverImageUrl: true } },
          session: true,
        },
        orderBy: { startsAt: "asc" },
        take: 8,
      }),
      studioId
        ? this.prisma.studio.findUnique({
            where: { id: studioId },
            select: {
              id: true,
              name: true,
              heroMobileUrl: true,
              heroDesktopUrl: true,
            },
          })
        : Promise.resolve(null),
      this.prisma.contestEntryMember.count({
        where: { studentId: resolvedStudentId },
      }),
      studioId
        ? this.prisma.contest.findMany({
            where: {
              studioId,
              status: { in: ["OPEN", "DRAFT"] },
              endsAt: { gte: now },
            },
            orderBy: { startsAt: "asc" },
            take: 4,
            select: {
              id: true,
              title: true,
              startsAt: true,
              endsAt: true,
              status: true,
            },
          })
        : Promise.resolve([]),
      this.prisma.notification.count({
        where: {
          userId: actor.id,
          readAt: null,
          status: "ACTIVE",
          deletedAt: null,
        },
      }),
      this.prisma.post.count({
        where: studioId
          ? { author: { studioId } }
          : { authorId: resolvedStudentId },
      }),
      studioId
        ? this.goals.getOrNull(resolvedStudentId, studioId, now)
        : Promise.resolve(null),
    ]);

    const presentSessions = presentAttendance.map((row) => ({
      sessionId: row.session.id,
      startsAt: row.session.startsAt,
    }));
    const sessionsCompleted = computeSessionsCompleted(presentSessions);
    const streak = computeAttendanceStreak(presentSessions, now);

    const attendedByBatch = new Map<string, number>();
    for (const row of presentAttendance) {
      const batchId = row.session.batchId;
      attendedByBatch.set(batchId, (attendedByBatch.get(batchId) ?? 0) + 1);
    }

    const progress = enrollments.map((enrollment) => {
      const totalSessions = enrollment.batch._count.sessions;
      const attendedSessions = attendedByBatch.get(enrollment.batchId) ?? 0;
      const nextLesson = enrollment.batch.sessions[0] ?? null;
      const stats = computeBatchProgress({ totalSessions, attendedSessions });
      const styleBadge = styleBadgeFromCategories(
        enrollment.batch.danceCategories,
      );

      return {
        batchId: enrollment.batchId,
        batchName: enrollment.batch.name,
        styleBadge,
        branchName: enrollment.batch.branch?.name ?? null,
        ...stats,
        nextLesson: nextLesson
          ? {
              sessionId: nextLesson.id,
              startsAt: nextLesson.startsAt.toISOString(),
              endsAt: nextLesson.endsAt.toISOString(),
            }
          : null,
      };
    });

    const todayTimeline: Array<{
      id: string;
      kind: "SESSION" | "BOOKING";
      title: string;
      startsAt: string;
      endsAt: string;
      batchId: string;
      branchName: string | null;
      state: "completed" | "now" | "upcoming";
    }> = upcomingSessions
      .filter(
        (session) =>
          session.startsAt >= todayStart && session.startsAt < todayEnd,
      )
      .map((session) => {
        const attendanceStatus = session.attendance[0]?.status ?? null;
        const state =
          attendanceStatus === "PRESENT"
            ? ("completed" as const)
            : session.startsAt.getTime() <= now.getTime()
              ? ("now" as const)
              : ("upcoming" as const);
        return {
          id: session.id,
          kind: "SESSION" as const,
          title: session.batch.name,
          startsAt: session.startsAt.toISOString(),
          endsAt: session.endsAt.toISOString(),
          batchId: session.batch.id,
          branchName: session.batch.branch?.name ?? null,
          state,
        };
      });

    for (const booking of todayBookings) {
      const startsAt = booking.session?.startsAt ?? booking.startsAt;
      const endsAt = booking.session?.endsAt ?? booking.endsAt;
      if (!startsAt || !endsAt) continue;
      if (startsAt < todayStart || startsAt >= todayEnd) continue;
      todayTimeline.push({
        id: booking.id,
        kind: "BOOKING",
        title: booking.batch?.name ?? "Booking",
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        batchId: booking.batchId ?? booking.batch?.id ?? "",
        branchName: null,
        state: startsAt.getTime() <= now.getTime() ? "now" : "upcoming",
      });
    }

    todayTimeline.sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );

    const nextSession =
      upcomingSessions.find(
        (session) => session.startsAt.getTime() >= now.getTime(),
      ) ?? null;

    const membership = membershipRows[0]
      ? {
          id: membershipRows[0].id,
          status: membershipRows[0].status,
          periodEnd: membershipRows[0].periodEnd.toISOString(),
          subscriptionName: membershipRows[0].subscription?.name ?? null,
          price: membershipRows[0].subscription
            ? Number(membershipRows[0].subscription.price)
            : null,
          billingCadence:
            membershipRows[0].subscription?.billingCadence ?? null,
          needsRenewal:
            membershipRows[0].status === "DUE" ||
            membershipRows[0].status === "EXPIRED",
        }
      : null;

    const hasClassToday = todayTimeline.some(
      (item) => item.state === "upcoming" || item.state === "now",
    );

    let hero: {
      kind: "nextClass" | "streak" | "membership" | "empty";
      title: string;
      subtitle: string;
      meta?: string | null;
      cta?: { label: string; to: string } | null;
      nextClass?: {
        sessionId: string;
        batchId: string;
        batchName: string;
        startsAt: string;
        endsAt: string;
        branchName: string | null;
        coverImageUrl: string | null;
      } | null;
      streak?: number;
      membership?: typeof membership;
    };

    if (nextSession) {
      hero = {
        kind: "nextClass",
        title: nextSession.batch.name,
        subtitle: "Your next move is calling",
        meta: nextSession.batch.branch?.name ?? null,
        cta: { label: "Open class", to: "/me/calendar" },
        nextClass: {
          sessionId: nextSession.id,
          batchId: nextSession.batch.id,
          batchName: nextSession.batch.name,
          startsAt: nextSession.startsAt.toISOString(),
          endsAt: nextSession.endsAt.toISOString(),
          branchName: nextSession.batch.branch?.name ?? null,
          coverImageUrl: await this.media.signReadUrl(
            nextSession.batch.coverImageUrl,
          ),
        },
        streak,
        membership,
      };
    } else if (enrollments.length > 0 && streak > 0) {
      hero = {
        kind: "streak",
        title: `${streak}-day streak`,
        subtitle: "Keep the beat going",
        meta: `${sessionsCompleted} classes completed`,
        cta: { label: "Book a class", to: "/me/book" },
        streak,
        membership,
      };
    } else if (enrollments.length > 0 && membership) {
      hero = {
        kind: "membership",
        title: membership.subscriptionName ?? "Membership",
        subtitle: membership.needsRenewal
          ? "Renew so you don't miss the floor"
          : "Your subscription is active",
        meta: `Expires ${new Date(membership.periodEnd).toLocaleDateString()}`,
        cta: membership.needsRenewal
          ? { label: "Renew subscription", to: "/me/subscriptions" }
          : { label: "View subscription", to: "/me/subscriptions" },
        membership,
        streak,
      };
    } else if (enrollments.length > 0) {
      hero = {
        kind: "empty",
        title: "No class on the board yet",
        subtitle: "Grab a seat and get moving",
        cta: { label: "Find a class", to: "/me/book" },
        streak,
        membership,
      };
    } else {
      hero = {
        kind: "empty",
        title: "Your first step starts here",
        subtitle: "Book a free trial and meet your coaches",
        cta: { label: "Book a free trial", to: "/me/book" },
        streak: 0,
        membership: null,
      };
    }

    const preferredBranchId =
      student.preferredBranchId ??
      nextSession?.batch.branch?.id ??
      enrollments.find((row) => row.batch.branch?.id)?.batch.branch?.id ??
      null;

    const enrolledIds = new Set(enrollments.map((row) => row.batchId));
    const studentStyles = new Set(
      (student.styles ?? []).map((style) => style.toLowerCase()),
    );
    const studentVibes = student.scheduleVibe ?? [];
    const preferredBatchBranchId = student.preferredBranchId ?? null;
    const monthlyPresent = presentSessions.filter(
      (row) => row.startsAt >= periodStart && row.startsAt < periodEnd,
    ).length;

    const [branch, trainerLinks, recommendBatches, achievements] =
      await Promise.all([
        studioId != null
          ? this.prisma.studioBranch.findFirst({
              where: preferredBranchId
                ? { id: preferredBranchId, studioId }
                : { studioId },
              include: {
                coverMedia: true,
                media: {
                  where: { archivedAt: null, kind: "IMAGE" },
                  orderBy: { sortOrder: "asc" },
                  take: 1,
                },
              },
              orderBy: { createdAt: "asc" },
            })
          : Promise.resolve(null),
        studioId != null
          ? this.prisma.batchTrainer.findMany({
              where: {
                batch: {
                  studioId,
                  active: true,
                  ...(preferredBranchId ? { branchId: preferredBranchId } : {}),
                },
              },
              include: {
                trainer: true,
                batch: {
                  select: {
                    danceCategories: true,
                  },
                },
              },
              take: 48,
            })
          : Promise.resolve([]),
        studioId != null
          ? this.prisma.batch.findMany({
              where: {
                studioId,
                active: true,
                ...(enrolledIds.size > 0
                  ? { id: { notIn: [...enrolledIds] } }
                  : {}),
              },
              select: {
                id: true,
                name: true,
                branchId: true,
                coverImageUrl: true,
                danceCategories: true,
                scheduleJson: true,
                ratingAvg: true,
                capacity: true,
                _count: {
                  select: {
                    enrollments: { where: { status: "ACTIVE" } },
                  },
                },
              },
              orderBy: { name: "asc" },
              take: 24,
            })
          : Promise.resolve([]),
        this.achievements.listForStudent(resolvedStudentId, studioId, {
          sessionsCompleted,
          streak,
          contestEntries,
        }),
      ]);

    const coverSource = branch?.coverMedia ?? branch?.media[0] ?? null;
    let branchImageUrl: string | null = null;
    if (coverSource?.objectKey) {
      try {
        branchImageUrl =
          (await this.media.signReadUrl(coverSource.objectKey)) ??
          coverSource.objectKey;
      } catch {
        branchImageUrl = coverSource.objectKey;
      }
    }

    const signHero = async (key: string | null | undefined) => {
      if (!key) return null;
      try {
        return (await this.media.signReadUrl(key)) ?? key;
      } catch {
        return key;
      }
    };

    const heroMobileUrl = await signHero(studio?.heroMobileUrl);
    const heroDesktopUrl = await signHero(studio?.heroDesktopUrl);
    const hasStudioHero = Boolean(heroMobileUrl || heroDesktopUrl);

    const banner = hasStudioHero
      ? {
          branchId: branch?.id ?? null,
          branchName: branch?.name ?? null,
          imageUrl: heroMobileUrl ?? heroDesktopUrl,
          desktopImageUrl: heroDesktopUrl ?? heroMobileUrl,
          altText: studio?.name ?? "Studio hero",
        }
      : branch
        ? {
            branchId: branch.id,
            branchName: branch.name,
            imageUrl: branchImageUrl,
            desktopImageUrl: branchImageUrl,
            altText:
              coverSource?.altText ?? coverSource?.caption ?? branch.name,
          }
        : null;

    const instructorsMap = new Map<
      string,
      {
        id: string;
        name: string;
        photoUrl: string | null;
        styleBadge: string | null;
      }
    >();
    for (const link of trainerLinks) {
      if (instructorsMap.has(link.trainerId)) continue;
      const trainer = this.crypto.decryptUser(link.trainer);
      instructorsMap.set(link.trainerId, {
        id: trainer.id,
        name: trainer.name,
        photoUrl: trainer.photoUrl,
        styleBadge: styleBadgeFromCategories(link.batch.danceCategories),
      });
      if (instructorsMap.size >= 8) break;
    }
    const instructors = await Promise.all(
      [...instructorsMap.values()].map(async (instructor) => ({
        ...instructor,
        photoUrl: await this.media.signReadUrl(instructor.photoUrl),
      })),
    );

    const recommendationRows = recommendBatches
      .map((batch) => {
        const styleBadge = styleBadgeFromCategories(batch.danceCategories);
        return {
          id: batch.id,
          name: batch.name,
          branchId: batch.branchId,
          coverImageUrl: batch.coverImageUrl,
          styleBadge,
          scheduleJson: batch.scheduleJson,
          scheduleLabel: scheduleLabelFrom(batch.scheduleJson),
          ratingAvg: batch.ratingAvg,
          capacity: batch.capacity,
          remainingSeats: Math.max(
            0,
            batch.capacity - batch._count.enrollments,
          ),
          price: null,
        };
      })
      .filter((batch) => {
        if (studentStyles.size === 0) return true;
        const badge = batch.styleBadge?.toLowerCase();
        return badge ? studentStyles.has(badge) : true;
      })
      .sort((a, b) => {
        const aBranch =
          preferredBatchBranchId && a.branchId === preferredBatchBranchId
            ? 1
            : 0;
        const bBranch =
          preferredBatchBranchId && b.branchId === preferredBatchBranchId
            ? 1
            : 0;
        if (aBranch !== bBranch) return bBranch - aBranch;
        return (
          scheduleVibeScore(b.scheduleJson, studentVibes) -
          scheduleVibeScore(a.scheduleJson, studentVibes)
        );
      })
      .slice(0, 8);

    const recommendations = await Promise.all(
      recommendationRows.map(async (row) => {
        const {
          scheduleJson: _scheduleJson,
          branchId: _branchId,
          coverImageUrl,
          ...rest
        } = row;
        return {
          ...rest,
          coverImageUrl: await this.media.signReadUrl(coverImageUrl),
        };
      }),
    );

    const hasEnrollment = enrollments.length > 0;

    return {
      student: {
        id: decrypted.id,
        name: decrypted.name,
        photoUrl: await this.media.signReadUrl(decrypted.photoUrl),
        styles: decrypted.styles,
      },
      studio: studio ? { id: studio.id, name: studio.name } : null,
      banner,
      instructors,
      hasEnrollment,
      greeting: greetingFor(now),
      hero,
      nextClass: hero.nextClass ?? null,
      membership,
      todayTimeline,
      progress,
      stats: {
        streak,
        sessionsCompleted,
        monthlySessions: monthlyPresent,
      },
      goal: goal
        ? {
            id: goal.id,
            type: goal.type,
            target: goal.target,
            current: monthlyPresent,
            periodStart: goal.periodStart.toISOString(),
            periodEnd: goal.periodEnd.toISOString(),
          }
        : {
            id: null,
            type: "MONTHLY_SESSIONS" as const,
            target: 8,
            current: monthlyPresent,
            periodStart: periodStart.toISOString(),
            periodEnd: periodEnd.toISOString(),
          },
      achievements,
      recommendations,
      community: {
        contests: contests.map((contest) => ({
          id: contest.id,
          title: contest.title,
          startsAt: contest.startsAt.toISOString(),
          endsAt: contest.endsAt.toISOString(),
          status: contest.status,
        })),
        feedPostCount: feedPeek,
      },
      notificationsUnread,
      quickActions: {
        primary: hasClassToday
          ? { label: "Check in", to: "/me/check-in" }
          : { label: "Book class", to: "/me/book" },
        items: [
          { label: "Discover", to: "/me/book", icon: "search" },
          { label: "Check in", to: "/me/check-in", icon: "check-circle" },
          { label: "Calendar", to: "/me/calendar", icon: "calendar" },
          { label: "Membership", to: "/me/subscriptions", icon: "clipboard" },
          { label: "Attendance", to: "/me/attendance", icon: "badge-check" },
          { label: "Messages", to: "/me/messages", icon: "message-square" },
        ],
      },
      generatedAt: now.toISOString(),
    };
  }
}
