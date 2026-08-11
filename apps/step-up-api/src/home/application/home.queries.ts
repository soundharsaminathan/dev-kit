import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type { DecryptedUser } from "../../users/user-crypto.service";
import { GoalsService } from "../goals.service";
import { monthPeriodBounds } from "../home-stats";

@Injectable()
export class HomeQueriesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(GoalsService) private readonly goals: GoalsService,
  ) {}

  private async resolveStudentId(actor: DecryptedUser, studentId?: string) {
    const targetId = studentId?.trim() || actor.id;
    if (targetId === actor.id) {
      return targetId;
    }
    if (actor.role !== UserRole.PARENT) {
      throw new ForbiddenException("You can only manage your own goal");
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

  private async requireStudentStudioId(studentId: string) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { studioId: true },
    });
    if (!student?.studioId) {
      throw new NotFoundException("Student studio not found");
    }
    return student.studioId;
  }

  async getMonthlyGoal(actor: DecryptedUser, studentId?: string) {
    const resolvedStudentId = await this.resolveStudentId(actor, studentId);
    const studioId = await this.requireStudentStudioId(resolvedStudentId);
    const now = new Date();
    const goal = await this.goals.getOrNull(resolvedStudentId, studioId, now);
    const { periodStart, periodEnd } = monthPeriodBounds(now);
    const monthlySessions = await this.prisma.attendance.count({
      where: {
        studentId: resolvedStudentId,
        status: "PRESENT",
        session: {
          startsAt: { gte: periodStart, lt: periodEnd },
        },
      },
    });
    return {
      id: goal?.id ?? null,
      type: "MONTHLY_SESSIONS" as const,
      target: goal?.target ?? 8,
      current: monthlySessions,
      periodStart: (goal?.periodStart ?? periodStart).toISOString(),
      periodEnd: (goal?.periodEnd ?? periodEnd).toISOString(),
    };
  }

  async upsertMonthlyGoal(
    actor: DecryptedUser,
    target: number,
    studentId?: string,
  ) {
    const resolvedStudentId = await this.resolveStudentId(actor, studentId);
    const studioId = await this.requireStudentStudioId(resolvedStudentId);
    return this.goals.upsertMonthlyGoal(resolvedStudentId, studioId, target);
  }
}
