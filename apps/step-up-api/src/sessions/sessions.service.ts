import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  NotificationType,
  SessionStatus,
  SessionType,
  UserRole,
} from "@prisma/client";
import { ACTIVE_ENROLLMENT_WHERE } from "../batches/enrollment-status";
import { ScheduleConflictService } from "../calendar/schedule-conflict.service";
import { ChatService } from "../chat/chat.service";
import { ImportLockService } from "../data-import/import-lock.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  type DecryptedUser,
  UserCryptoService,
} from "../users/user-crypto.service";
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
    @Inject(UserCryptoService) private readonly crypto: UserCryptoService,
    @Inject(ImportLockService)
    private readonly importLock: ImportLockService,
  ) {}

  private async assertSessionBatchUnlocked(sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { batch: { select: { id: true, studioId: true } } },
    });
    if (!session) {
      throw new NotFoundException("Session not found");
    }
    await this.importLock.assertBatchUnlocked(
      session.batch.studioId,
      session.batch.id,
    );
  }

  listByBatch(batchId: string) {
    return this.prisma.session.findMany({
      where: { batchId, status: { not: SessionStatus.CANCELLED } },
      orderBy: { startsAt: "asc" },
    });
  }

  async listTrialSlots(
    studioId: string,
    from?: string,
    to?: string,
  ): Promise<TrialSlotDto[]> {
    if (from || to) {
      return this.listTrialSlotsForRange(studioId, from, to);
    }

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

    const slots = sessions.map((session) => this.toTrialSlotDto(session));

    await this.trialSlotsCache.set(studioId, JSON.stringify(slots));
    return slots;
  }

  private async listTrialSlotsForRange(
    studioId: string,
    from?: string,
    to?: string,
  ): Promise<TrialSlotDto[]> {
    const now = new Date();
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;
    if (toDate && toDate.getTime() <= now.getTime()) {
      return [];
    }

    const lower =
      fromDate && fromDate.getTime() > now.getTime() ? fromDate : now;

    const sessions = await this.prisma.session.findMany({
      where: {
        status: SessionStatus.SCHEDULED,
        startsAt: {
          gte: lower,
          ...(toDate ? { lt: toDate } : {}),
        },
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

    return sessions.map((session) => this.toTrialSlotDto(session));
  }

  private toTrialSlotDto(session: {
    id: string;
    batchId: string;
    startsAt: Date;
    endsAt: Date;
    batch: { id: string; name: string; danceCategories: unknown };
  }): TrialSlotDto {
    return {
      sessionId: session.id,
      batchId: session.batchId,
      batchName: session.batch.name,
      styleBadge: styleBadgeFromCategories(session.batch.danceCategories),
      startsAt: session.startsAt.toISOString(),
      endsAt: session.endsAt.toISOString(),
    };
  }

  getById(id: string) {
    return this.prisma.session.findUniqueOrThrow({
      where: { id },
      include: {
        attendance: true,
        batch: {
          include: {
            trainers: { orderBy: { sortOrder: "asc" } },
          },
        },
      },
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
    await this.importLock.assertBatchUnlocked(batch.studioId, data.batchId);

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
    await this.assertSessionBatchUnlocked(id);
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
    await this.assertSessionBatchUnlocked(id);
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

  async complete(
    actor: DecryptedUser,
    id: string,
    data: { trainerId?: string } = {},
  ) {
    await this.assertSessionBatchUnlocked(id);
    const session = await this.prisma.session.findUnique({
      where: { id },
      include: {
        batch: {
          select: {
            id: true,
            studioId: true,
            trainers: {
              orderBy: { sortOrder: "asc" },
              select: { trainerId: true },
            },
          },
        },
      },
    });
    if (!session) {
      throw new NotFoundException("Session not found");
    }
    if (session.status !== SessionStatus.SCHEDULED) {
      throw new BadRequestException("Only scheduled sessions can be completed");
    }

    const trainerId = await this.resolveCompletingTrainer(
      actor,
      session.batch.studioId,
      session.batch.trainers,
      data.trainerId,
    );

    const updated = await this.prisma.session.update({
      where: { id },
      data: { status: SessionStatus.COMPLETED, trainerId },
      include: { batch: { select: { studioId: true } } },
    });
    await this.trialSlotsCache.invalidate(updated.batch.studioId);
    return updated;
  }

  async listIncompletePast(studioId: string) {
    const now = new Date();
    const sessions = await this.prisma.session.findMany({
      where: {
        status: SessionStatus.SCHEDULED,
        endsAt: { lt: now },
        batch: { studioId },
      },
      orderBy: { startsAt: "asc" },
      include: {
        batch: {
          select: {
            id: true,
            name: true,
            trainers: {
              orderBy: { sortOrder: "asc" },
              take: 1,
              select: { trainerId: true },
            },
          },
        },
      },
    });

    const trainerIds = [
      ...new Set(
        sessions
          .map((session) => session.batch.trainers[0]?.trainerId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const trainers =
      trainerIds.length === 0
        ? []
        : await this.prisma.user.findMany({
            where: { id: { in: trainerIds } },
          });
    const names = new Map(
      trainers.map((trainer) => [
        trainer.id,
        this.crypto.decryptUser(trainer).name,
      ]),
    );

    return sessions.map((session) => {
      const firstTrainerId = session.batch.trainers[0]?.trainerId ?? null;
      return {
        id: session.id,
        batchId: session.batch.id,
        batchName: session.batch.name,
        startsAt: session.startsAt.toISOString(),
        endsAt: session.endsAt.toISOString(),
        firstTrainer: firstTrainerId
          ? { id: firstTrainerId, name: names.get(firstTrainerId) ?? "Trainer" }
          : null,
      };
    });
  }

  private async resolveCompletingTrainer(
    actor: DecryptedUser,
    studioId: string,
    batchTrainers: { trainerId: string }[],
    requestedTrainerId?: string,
  ): Promise<string> {
    if (actor.role === UserRole.TRAINER) {
      const trainer = await this.prisma.user.findFirst({
        where: { id: actor.id, studioId, role: UserRole.TRAINER },
        select: { id: true },
      });
      if (!trainer) {
        throw new ForbiddenException("You are not a trainer at this studio");
      }
      return actor.id;
    }

    const firstTrainerId = batchTrainers[0]?.trainerId ?? null;
    const trainerId = requestedTrainerId ?? firstTrainerId;
    if (!trainerId) {
      throw new BadRequestException(
        "Select a trainer to complete this session",
      );
    }

    const trainer = await this.prisma.user.findFirst({
      where: { id: trainerId, studioId, role: UserRole.TRAINER },
      select: { id: true },
    });
    if (!trainer) {
      throw new BadRequestException("Trainer must belong to this studio");
    }
    return trainer.id;
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
