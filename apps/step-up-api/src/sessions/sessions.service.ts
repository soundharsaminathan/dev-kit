import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { SessionStatus, SessionType } from "@prisma/client";
import { ScheduleConflictService } from "../calendar/schedule-conflict.service";
import { PrismaService } from "../prisma/prisma.service";
import { TrialSlotsCacheService } from "./trial-slots-cache.service";

const TRIAL_HORIZON_DAYS = 35;

function styleBadgeFromCategories(danceCategories: unknown): string | null {
  if (!Array.isArray(danceCategories) || danceCategories.length === 0) {
    return null;
  }
  const first = danceCategories[0] as { name?: string };
  return first?.name?.trim() || null;
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
  ) {}

  listByBatch(batchId: string) {
    return this.prisma.session.findMany({
      where: { batchId },
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
        type: SessionType.TRIAL,
        status: { not: SessionStatus.CANCELLED },
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

  async create(data: {
    batchId: string;
    startsAt: string;
    endsAt: string;
    type?: SessionType;
  }) {
    const startsAt = new Date(data.startsAt);
    const endsAt = new Date(data.endsAt);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw new BadRequestException("Invalid startsAt or endsAt");
    }
    if (endsAt <= startsAt) {
      throw new BadRequestException("endsAt must be after startsAt");
    }

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
}
