import { toUtcDayKey } from "../home/home-stats";
import type {
  JourneyEvent,
  JourneyEventKind,
  JourneyEventStatus,
  JourneyEventTier,
  JourneyFilterTag,
  JourneyStats,
  JourneyTrainer,
} from "./journey-types";

export const STREAK_MILESTONES = [7, 14, 30, 60, 100] as const;

const XP_BY_KIND: Record<JourneyEventKind, number> = {
  JOINED: 50,
  BATCH: 40,
  PLAN: 30,
  ATTENDANCE: 5,
  ATTENDANCE_STREAK: 25,
  COMPETITION: 80,
  CERTIFICATE: 100,
  ACHIEVEMENT: 60,
  TRAINER: 20,
  LEVEL_UP: 90,
  FEEDBACK: 15,
};

const LARGE_ACHIEVEMENT_CODES = new Set([
  "LEVEL_UP",
  "FIRST_CERTIFICATE",
  "COMPETITION_WIN",
  "PROMOTION",
]);

export type JourneyEnrollmentInput = {
  id: string;
  batchId: string;
  enrolledAt: Date;
  batchName: string;
  coverImageUrl: string | null;
  trainers: JourneyTrainer[];
};

export type JourneyAttendanceInput = {
  id: string;
  sessionId: string;
  startsAt: Date;
  batchId: string;
  batchName: string;
};

export type JourneyMembershipInput = {
  id: string;
  periodStart: Date;
  subscriptionName: string | null;
};

export type JourneyContestInput = {
  entryId: string;
  contestTitle: string;
  registeredAt: Date;
  placement: number | null;
  coverImageUrl?: string | null;
};

export type JourneyCertificateInput = {
  id: string;
  issuedAt: Date;
  certificateNumber: string;
  contestTitle: string;
};

export type JourneyAchievementInput = {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  earnedAt: Date;
  newlyEarned: boolean;
};

export type JourneyRatingInput = {
  id: string;
  batchId: string;
  batchName: string;
  rating: number;
  createdAt: Date;
};

export type BuildJourneyEventsInput = {
  joinedAt: Date | null;
  studioName: string | null;
  enrollments: JourneyEnrollmentInput[];
  attendance: JourneyAttendanceInput[];
  memberships: JourneyMembershipInput[];
  contests: JourneyContestInput[];
  certificates: JourneyCertificateInput[];
  achievements: JourneyAchievementInput[];
  ratings: JourneyRatingInput[];
  experienceLevel: string | null;
  now?: Date;
};

function formatLevel(level: string | null): string | null {
  if (!level) return null;
  return level
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function eventBase(input: {
  id: string;
  kind: JourneyEventKind;
  tier: JourneyEventTier;
  title: string;
  occurredAt: Date;
  icon: string;
  filterTags: JourneyFilterTag[];
  imageUrl?: string | null;
  trainer?: JourneyTrainer | null;
  certificatePreviewUrl?: string | null;
  newlyEarned?: boolean;
  meta?: Record<string, unknown>;
}): JourneyEvent {
  return {
    id: input.id,
    kind: input.kind,
    tier: input.tier,
    title: input.title,
    occurredAt: input.occurredAt.toISOString(),
    status: "completed",
    icon: input.icon,
    imageUrl: input.imageUrl ?? null,
    trainer: input.trainer ?? null,
    certificatePreviewUrl: input.certificatePreviewUrl ?? null,
    xp: XP_BY_KIND[input.kind],
    newlyEarned: input.newlyEarned ?? false,
    meta: input.meta ?? {},
    filterTags: input.filterTags,
  };
}

export function computeLongestStreak(
  presentSessions: Array<{ startsAt: Date }>,
): number {
  if (presentSessions.length === 0) return 0;
  const days = [
    ...new Set(presentSessions.map((row) => toUtcDayKey(row.startsAt))),
  ].sort();
  let longest = 1;
  let current = 1;
  for (let i = 1; i < days.length; i += 1) {
    const prev = new Date(`${days[i - 1]}T00:00:00.000Z`);
    const next = new Date(`${days[i]}T00:00:00.000Z`);
    const diffDays = Math.round((next.getTime() - prev.getTime()) / 86_400_000);
    if (diffDays === 1) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
}

export function yearsBetween(from: Date, to: Date): number {
  const ms = Math.max(0, to.getTime() - from.getTime());
  return Math.round((ms / (365.25 * 86_400_000)) * 10) / 10;
}

function streakEventsFromAttendance(
  attendance: JourneyAttendanceInput[],
): JourneyEvent[] {
  const byDay = new Map<string, JourneyAttendanceInput>();
  for (const row of attendance) {
    const key = toUtcDayKey(row.startsAt);
    const existing = byDay.get(key);
    if (!existing || row.startsAt < existing.startsAt) {
      byDay.set(key, row);
    }
  }
  const days = [...byDay.keys()].sort();
  const events: JourneyEvent[] = [];
  let streak = 0;
  let prevDay: string | null = null;
  const hit = new Set<number>();

  for (const day of days) {
    if (prevDay) {
      const prev = new Date(`${prevDay}T00:00:00.000Z`);
      const curr = new Date(`${day}T00:00:00.000Z`);
      const diff = Math.round((curr.getTime() - prev.getTime()) / 86_400_000);
      streak = diff === 1 ? streak + 1 : 1;
    } else {
      streak = 1;
    }
    prevDay = day;
    for (const milestone of STREAK_MILESTONES) {
      if (streak === milestone && !hit.has(milestone)) {
        hit.add(milestone);
        const row = byDay.get(day)!;
        events.push(
          eventBase({
            id: `streak-${milestone}-${day}`,
            kind: "ATTENDANCE_STREAK",
            tier: "small",
            title: `${milestone}-day streak`,
            occurredAt: row.startsAt,
            icon: "zap",
            filterTags: ["attendance", "achievements"],
            meta: { streakDays: milestone },
          }),
        );
      }
    }
  }
  return events;
}

export function buildJourneyEvents(
  input: BuildJourneyEventsInput,
): JourneyEvent[] {
  const events: JourneyEvent[] = [];

  if (input.joinedAt) {
    events.push(
      eventBase({
        id: "joined-studio",
        kind: "JOINED",
        tier: "large",
        title: input.studioName
          ? `Joined ${input.studioName}`
          : "Joined studio",
        occurredAt: input.joinedAt,
        icon: "sparkles",
        filterTags: ["batches"],
      }),
    );
  }

  for (const enrollment of input.enrollments) {
    const primaryTrainer = enrollment.trainers[0] ?? null;
    events.push(
      eventBase({
        id: `batch-${enrollment.id}`,
        kind: "BATCH",
        tier: "medium",
        title: enrollment.batchName,
        occurredAt: enrollment.enrolledAt,
        icon: "users",
        imageUrl: enrollment.coverImageUrl,
        trainer: primaryTrainer,
        filterTags: ["batches"],
        meta: { batchId: enrollment.batchId },
      }),
    );
    if (primaryTrainer) {
      events.push(
        eventBase({
          id: `trainer-${enrollment.id}-${primaryTrainer.id}`,
          kind: "TRAINER",
          tier: "medium",
          title: `Trainer · ${primaryTrainer.name}`,
          occurredAt: new Date(enrollment.enrolledAt.getTime() + 1000),
          icon: "user",
          trainer: primaryTrainer,
          filterTags: ["batches"],
          meta: {
            batchId: enrollment.batchId,
            trainerId: primaryTrainer.id,
          },
        }),
      );
    }
  }

  for (const membership of input.memberships) {
    events.push(
      eventBase({
        id: `plan-${membership.id}`,
        kind: "PLAN",
        tier: "medium",
        title: membership.subscriptionName
          ? membership.subscriptionName
          : "Plan activated",
        occurredAt: membership.periodStart,
        icon: "clipboard",
        filterTags: ["plans"],
        meta: { membershipId: membership.id },
      }),
    );
  }

  for (const row of input.attendance) {
    events.push(
      eventBase({
        id: `attendance-${row.id}`,
        kind: "ATTENDANCE",
        tier: "small",
        title: row.batchName,
        occurredAt: row.startsAt,
        icon: "check-circle",
        filterTags: ["attendance"],
        meta: {
          batchId: row.batchId,
          sessionId: row.sessionId,
        },
      }),
    );
  }

  events.push(...streakEventsFromAttendance(input.attendance));

  for (const contest of input.contests) {
    const placementLabel =
      contest.placement != null ? ` · #${contest.placement}` : "";
    events.push(
      eventBase({
        id: `competition-${contest.entryId}`,
        kind: "COMPETITION",
        tier: "large",
        title: `${contest.contestTitle}${placementLabel}`,
        occurredAt: contest.registeredAt,
        icon: "star",
        imageUrl: contest.coverImageUrl ?? null,
        filterTags: ["competitions"],
        meta: {
          entryId: contest.entryId,
          placement: contest.placement,
        },
      }),
    );
  }

  for (const cert of input.certificates) {
    events.push(
      eventBase({
        id: `certificate-${cert.id}`,
        kind: "CERTIFICATE",
        tier: "large",
        title: cert.contestTitle,
        occurredAt: cert.issuedAt,
        icon: "badge-check",
        filterTags: ["certificates"],
        meta: {
          certificateId: cert.id,
          certificateNumber: cert.certificateNumber,
        },
      }),
    );
  }

  for (const achievement of input.achievements) {
    const isLarge = LARGE_ACHIEVEMENT_CODES.has(achievement.code);
    events.push(
      eventBase({
        id: `achievement-${achievement.id}`,
        kind: "ACHIEVEMENT",
        tier: isLarge ? "large" : "small",
        title: achievement.title,
        occurredAt: achievement.earnedAt,
        icon: achievement.icon || "star",
        newlyEarned: achievement.newlyEarned,
        filterTags: ["achievements"],
        meta: {
          code: achievement.code,
          description: achievement.description,
        },
      }),
    );
  }

  for (const rating of input.ratings) {
    events.push(
      eventBase({
        id: `feedback-${rating.id}`,
        kind: "FEEDBACK",
        tier: "small",
        title: `${rating.rating}★ · ${rating.batchName}`,
        occurredAt: rating.createdAt,
        icon: "message-square",
        filterTags: ["feedback"],
        meta: {
          batchId: rating.batchId,
          rating: rating.rating,
        },
      }),
    );
  }

  if (input.experienceLevel) {
    const earliest =
      input.enrollments
        .map((e) => e.enrolledAt)
        .sort((a, b) => a.getTime() - b.getTime())[0] ?? input.joinedAt;
    if (earliest) {
      events.push(
        eventBase({
          id: `level-${input.experienceLevel}`,
          kind: "LEVEL_UP",
          tier: "large",
          title: formatLevel(input.experienceLevel) ?? input.experienceLevel,
          occurredAt: earliest,
          icon: "trending-up",
          filterTags: ["achievements"],
          meta: { level: input.experienceLevel },
        }),
      );
    }
  }

  events.sort(
    (a, b) =>
      new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  );

  return events;
}

export function markCurrentAndUpcoming(
  events: JourneyEvent[],
  now = new Date(),
): { events: JourneyEvent[]; currentEventId: string | null } {
  if (events.length === 0) {
    return { events, currentEventId: null };
  }

  const nowMs = now.getTime();
  let lastCompletedIndex = -1;
  const next: JourneyEvent[] = events.map((event, index) => {
    const at = new Date(event.occurredAt).getTime();
    if (at <= nowMs) {
      lastCompletedIndex = index;
      return { ...event, status: "completed" satisfies JourneyEventStatus };
    }
    return { ...event, status: "upcoming" satisfies JourneyEventStatus };
  });

  if (lastCompletedIndex < 0) {
    const first = next[0]!;
    next[0] = { ...first, status: "current" };
    return { events: next, currentEventId: first.id };
  }

  const current = next[lastCompletedIndex]!;
  next[lastCompletedIndex] = {
    ...current,
    status: "current",
  };
  return {
    events: next,
    currentEventId: current.id,
  };
}

export function buildJourneyStats(input: {
  joinedAt: Date | null;
  attendanceCount: number;
  presentCount: number;
  markedCount: number;
  certificates: number;
  competitions: number;
  currentStreak: number;
  longestStreak: number;
  experienceLevel: string | null;
  now?: Date;
}): JourneyStats {
  const now = input.now ?? new Date();
  const yearsLearning = input.joinedAt ? yearsBetween(input.joinedAt, now) : 0;
  const attendancePercent =
    input.markedCount === 0
      ? 0
      : Math.round((input.presentCount / input.markedCount) * 100);

  return {
    yearsLearning,
    classesAttended: input.attendanceCount,
    attendancePercent,
    certificates: input.certificates,
    competitions: input.competitions,
    currentStreak: input.currentStreak,
    longestStreak: input.longestStreak,
    currentLevel: formatLevel(input.experienceLevel),
  };
}
