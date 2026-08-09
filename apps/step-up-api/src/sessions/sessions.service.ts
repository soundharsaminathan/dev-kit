import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  NotificationType,
  SessionStatus,
  SessionType,
} from "@prisma/client";
import { ACTIVE_ENROLLMENT_WHERE } from "../batches/enrollment-status";
import { ScheduleConflictService } from "../calendar/schedule-conflict.service";
import { ChatService } from "../chat/chat.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import type { DecryptedUser } from "../users/user-crypto.service";
import { TrialSlotsCacheService } from "./trial-slots-cache.service";

const TRIAL_HORIZON_DAYS = 35;

function styleBadgeFromCategories(danceCategories: unknown): string | null {
  if (!Array.isArray(danceCategories) || danceCategories.length === 0) {
    return null;
  }
  const first = danceCategories[0] as { name?: string };
  return first?.name?.trim() || null;
}

function formatSessionWhen(startsAt: Date, endsAt: Date) {
  const date = startsAt.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const start = startsAt.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const end = endsAt.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${date} · ${start} – ${end}`;
}

export type TrialSlotDto = {
  sessionId: string;
  batchId: string;
  batchName: string;
  styleBadge: string | null;
  startsAt: string;
  endsAt: string;
};

@Injectable()
export class SessionsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ScheduleConflictService)
    private readonly scheduleConflicts: ScheduleConflictService,
    @Inject(TrialSlotsCacheService)
    private readonly trialSlotsCache: TrialSlotsCacheService,
    @Inject(NotificationsService)
    private readonly notifications: NotificationsService,
    @Inject(ChatService) private readonly chat: ChatService,
  ) {}

  listByBatch(batchId: string) {
    return this.prisma.session.findMany({
      where: { batchId, status: { not: SessionStatus.CANCELLED } },
      orderBy: { startsAt: "asc" },
    });
  }

  async listTrialSlots(studioId: string): Promise<TrialSlotDto[]> {
    const cached = await this.trialSlotsCache.get(studioId);
    if (cached !== null) {
      try {
        const parsed = JSON.parse(cached) as TrialSlotDto[];
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        await this.trialSlotsCache.invalidate(studioId);
      }
    }

    const now = new Date();
    const horizon = new Date(
      now.getTime() + TRIAL_HORIZON_DAYS * 24 * 60 * 60 * 1000,
    );

    const sessions = await this.prisma.session.findMany({
      where: {
        status: SessionStatus.SCHEDULED,
        startsAt: { gte: now, lte: horizon },
        batch: { studioId, active: true },
      },
      orderBy: { startsAt: "asc" },
      include: {
        batch: {
          select: {
            id: true,
            name: true,
            danceCategories: true,
          },
        },
      },
    });

    const slots: TrialSlotDto[] = sessions.map((session) => ({
      sessionId: session.id,
      batchId: session.batchId,
      batchName: session.batch.name,
      styleBadge: styleBadgeFromCategories(session.batch.danceCategories),
      startsAt: session.startsAt.toISOString(),
      endsAt: session.endsAt.toISOString(),
    }));

    await this.trialSlotsCache.set(studioId, JSON.stringify(slots));
    return slots;
  }

  getById(id: string) {
    return this.prisma.session.findUniqueOrThrow({
      where: { id },
      include: { attendance: true, batch: true },
    });
  }

  async create(
    actor: DecryptedUser,
    data: {
      batchId: string;
      startsAt: string;
      endsAt: string;
      type?: SessionType;
    },
  ) {
    const startsAt = new Date(data.startsAt);
    const endsAt = new Date(data.endsAt);
    this.assertValidWindow(startsAt, endsAt);

    const batch = await this.prisma.batch.findUnique({
      where: { id: data.batchId },
      include: { trainers: { select: { trainerId: true } } },
    });
    if (!batch) {
      throw new NotFoundException("Batch not found");
    }

    await this.scheduleConflicts.assertNoConflicts({
      intervals: [{ startsAt, endsAt }],
      trainerIds: batch.trainers.map((trainer) => trainer.trainerId),
      branchId: batch.branchId,
    });

    const session = await this.prisma.session.create({
      data: {
        batchId: data.batchId,
        startsAt,
        endsAt,
        status: SessionStatus.SCHEDULED,
        type: data.type ?? SessionType.REGULAR,
      },
    });

    await this.trialSlotsCache.invalidate(batch.studioId);
    void this.announceScheduleChange(actor, {
      action: "added",
      sessionId: session.id,
      batchId: batch.id,
      batchName: batch.name,
      startsAt,
      endsAt,
    }).catch(() => undefined);
    return session;
  }

  async updateSchedule(
    actor: DecryptedUser,
    id: string,
    data: { startsAt: string; endsAt: string },
  ) {
    const startsAt = new Date(data.startsAt);
    const endsAt = new Date(data.endsAt);
    this.assertValidWindow(startsAt, endsAt);

    const existing = await this.prisma.session.findUnique({
      where: { id },
      include: {
        batch: {
          include: { trainers: { select: { trainerId: true } } },
        },
      },
    });
    if (!existing) {
      throw new NotFoundException("Session not found");
    }
    if (existing.status !== SessionStatus.SCHEDULED) {
      throw new BadRequestException("Only scheduled sessions can be moved");
    }

    const previousStartsAt = existing.startsAt;
    const previousEndsAt = existing.endsAt;

    await this.scheduleConflicts.assertNoConflicts({
      intervals: [{ startsAt, endsAt }],
      trainerIds: existing.batch.trainers.map((trainer) => trainer.trainerId),
      branchId: existing.batch.branchId,
      excludeSessionIds: [id],
    });

    const session = await this.prisma.session.update({
      where: { id },
      data: { startsAt, endsAt },
    });

    await this.trialSlotsCache.invalidate(existing.batch.studioId);
    void this.announceScheduleChange(actor, {
      action: "changed",
      sessionId: session.id,
      batchId: existing.batch.id,
      batchName: existing.batch.name,
      startsAt,
      endsAt,
      previousStartsAt,
      previousEndsAt,
    }).catch(() => undefined);
    return session;
  }

  async cancel(actor: DecryptedUser, id: string) {
    const existing = await this.prisma.session.findUnique({
      where: { id },
      include: {
        batch: { select: { id: true, name: true, studioId: true } },
      },
    });
    if (!existing) {
      throw new NotFoundException("Session not found");
    }
    if (existing.status === SessionStatus.CANCELLED) {
      return existing;
    }
    if (existing.status === SessionStatus.COMPLETED) {
      throw new BadRequestException("Completed sessions cannot be deleted");
    }

    const session = await this.prisma.session.update({
      where: { id },
      data: { status: SessionStatus.CANCELLED },
    });

    await this.trialSlotsCache.invalidate(existing.batch.studioId);
    void this.announceScheduleChange(actor, {
      action: "cancelled",
      sessionId: session.id,
      batchId: existing.batch.id,
      batchName: existing.batch.name,
      startsAt: existing.startsAt,
      endsAt: existing.endsAt,
    }).catch(() => undefined);
    return session;
  }

  async complete(id: string) {
    const session = await this.prisma.session.update({
      where: { id },
      data: { status: SessionStatus.COMPLETED },
      include: { batch: { select: { studioId: true } } },
    });
    await this.trialSlotsCache.invalidate(session.batch.studioId);
    return session;
  }

  private assertValidWindow(startsAt: Date, endsAt: Date) {
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw new BadRequestException("Invalid startsAt or endsAt");
    }
    if (endsAt <= startsAt) {
      throw new BadRequestException("endsAt must be after startsAt");
    }
  }

  private async announceScheduleChange(
    actor: DecryptedUser,
    input: {
      action: "added" | "changed" | "cancelled";
      sessionId: string;
      batchId: string;
      batchName: string;
      startsAt: Date;
      endsAt: Date;
      previousStartsAt?: Date;
      previousEndsAt?: Date;
    },
  ) {
    const when = formatSessionWhen(input.startsAt, input.endsAt);
    const previousWhen =
      input.previousStartsAt && input.previousEndsAt
        ? formatSessionWhen(input.previousStartsAt, input.previousEndsAt)
        : null;

    const copy = {
      added: {
        type: NotificationType.SESSION_ADDED,
        title: "New class session",
        body: `${input.batchName} added a session on ${when}.`,
        cardTitle: "New class session",
        cardDescription: `${input.batchName} — a new session was added to the schedule.`,
      },
      changed: {
        type: NotificationType.SESSION_CHANGED,
        title: "Session rescheduled",
        body: previousWhen
          ? `${input.batchName} moved from ${previousWhen} to ${when}.`
          : `${input.batchName} was moved to ${when}.`,
        cardTitle: "Session rescheduled",
        cardDescription: previousWhen
          ? `${input.batchName} moved from ${previousWhen} to ${when}.`
          : `${input.batchName} was moved to ${when}.`,
      },
      cancelled: {
        type: NotificationType.SESSION_CANCELLED,
        title: "Session cancelled",
        body: `${input.batchName} cancelled the session on ${when}.`,
        cardTitle: "Session cancelled",
        cardDescription: `${input.batchName} cancelled this session.`,
      },
    }[input.action];

    const enrollments = await this.prisma.batchEnrollment.findMany({
      where: { batchId: input.batchId, ...ACTIVE_ENROLLMENT_WHERE },
      select: { studentId: true },
    });

    const stamp = Date.now();
    try {
      // Sequential creates avoid Prisma pool contention under parallel e2e load.
      for (const enrollment of enrollments) {
        await this.notifications.create({
          userId: enrollment.studentId,
          type: copy.type,
          title: copy.title,
          body: copy.body,
          batchName: input.batchName,
          sessionDate: input.startsAt.toISOString().slice(0, 10),
          dedupeKey: `${copy.type}:${input.sessionId}:${enrollment.studentId}:${stamp}`,
          meta: {
            sessionId: input.sessionId,
            batchId: input.batchId,
            action: input.action,
          },
          deepLink: `/me/batches/${input.batchId}`,
          actorId: actor.id,
          entityType: "session",
          entityId: input.sessionId,
        });
      }
    } catch {
      // Notifications are best-effort; schedule mutation already succeeded.
    }

    try {
      await this.chat.postBatchSessionCard(actor, input.batchId, {
        title: copy.cardTitle,
        description: copy.cardDescription,
        startsAt: input.startsAt.toISOString(),
        endsAt: input.endsAt.toISOString(),
      });
    } catch {
      // Chat card is best-effort; schedule mutation already succeeded.
    }
  }
}
