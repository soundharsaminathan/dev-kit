import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { SessionStatus } from "@prisma/client";
import { ScheduleConflictService } from "../calendar/schedule-conflict.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SessionsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ScheduleConflictService)
    private readonly scheduleConflicts: ScheduleConflictService,
  ) {}

  listByBatch(batchId: string) {
    return this.prisma.session.findMany({
      where: { batchId },
      orderBy: { startsAt: "asc" },
    });
  }

  getById(id: string) {
    return this.prisma.session.findUniqueOrThrow({
      where: { id },
      include: { attendance: true, batch: true },
    });
  }

  async create(data: { batchId: string; startsAt: string; endsAt: string }) {
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

    return this.prisma.session.create({
      data: {
        batchId: data.batchId,
        startsAt,
        endsAt,
        status: SessionStatus.SCHEDULED,
      },
    });
  }

  complete(id: string) {
    return this.prisma.session.update({
      where: { id },
      data: { status: SessionStatus.COMPLETED },
    });
  }
}
