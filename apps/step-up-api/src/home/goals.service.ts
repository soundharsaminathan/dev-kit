import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { StudentGoalType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { monthPeriodBounds } from "./home-stats";

@Injectable()
export class GoalsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  getOrNull(userId: string, studioId: string, now = new Date()) {
    return this.prisma.studentGoal.findFirst({
      where: {
        userId,
        studioId,
        type: StudentGoalType.MONTHLY_SESSIONS,
        periodStart: { lte: now },
        periodEnd: { gt: now },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async upsertMonthlyGoal(
    userId: string,
    studioId: string,
    target: number,
    now = new Date(),
  ) {
    if (!Number.isFinite(target) || target < 1 || target > 60) {
      throw new BadRequestException("Goal target must be between 1 and 60");
    }

    const studio = await this.prisma.studio.findUnique({
      where: { id: studioId },
      select: { id: true },
    });
    if (!studio) {
      throw new NotFoundException("Studio not found");
    }

    const { periodStart, periodEnd } = monthPeriodBounds(now);
    const existing = await this.getOrNull(userId, studioId, now);

    if (existing) {
      return this.prisma.studentGoal.update({
        where: { id: existing.id },
        data: { target: Math.round(target) },
      });
    }

    return this.prisma.studentGoal.create({
      data: {
        userId,
        studioId,
        type: StudentGoalType.MONTHLY_SESSIONS,
        target: Math.round(target),
        periodStart,
        periodEnd,
      },
    });
  }
}
