import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  NotFoundException,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { PrismaService } from "../prisma/prisma.service";
import type { DecryptedUser } from "../users/user-crypto.service";
import { GoalsService } from "./goals.service";
import { HomeService } from "./home.service";
import { monthPeriodBounds } from "./home-stats";

class HomeQueryDto {
  @IsOptional()
  @IsString()
  studentId?: string;
}

class UpsertGoalDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  target!: number;

  @IsOptional()
  @IsString()
  studentId?: string;
}

@Controller()
@UseGuards(AuthGuard, RolesGuard)
export class HomeController {
  constructor(
    @Inject(HomeService) private readonly home: HomeService,
    @Inject(GoalsService) private readonly goals: GoalsService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
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

  @Get("home")
  @Roles(UserRole.STUDENT, UserRole.PARENT)
  getHome(@CurrentUser() user: DecryptedUser, @Query() query: HomeQueryDto) {
    return this.home.getHome(user, query.studentId);
  }

  @Get("goals/me")
  @Roles(UserRole.STUDENT, UserRole.PARENT)
  async getGoal(
    @CurrentUser() user: DecryptedUser,
    @Query() query: HomeQueryDto,
  ) {
    const studentId = await this.resolveStudentId(user, query.studentId);
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { studioId: true },
    });
    if (!student?.studioId) {
      throw new NotFoundException("Student studio not found");
    }
    const now = new Date();
    const goal = await this.goals.getOrNull(studentId, student.studioId, now);
    const { periodStart, periodEnd } = monthPeriodBounds(now);
    const monthlySessions = await this.prisma.attendance.count({
      where: {
        studentId,
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

  @Put("goals/me")
  @Roles(UserRole.STUDENT, UserRole.PARENT)
  async upsertGoal(
    @CurrentUser() user: DecryptedUser,
    @Body() dto: UpsertGoalDto,
  ) {
    const studentId = await this.resolveStudentId(user, dto.studentId);
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { studioId: true },
    });
    if (!student?.studioId) {
      throw new NotFoundException("Student studio not found");
    }
    return this.goals.upsertMonthlyGoal(
      studentId,
      student.studioId,
      dto.target,
    );
  }
}
