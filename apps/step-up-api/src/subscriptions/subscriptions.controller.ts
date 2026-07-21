import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { IsOptional, IsString } from "class-validator";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { PrismaService } from "../prisma/prisma.service";
import type { DecryptedUser } from "../users/user-crypto.service";
import { SubscriptionsService } from "./subscriptions.service";

class AssignPlanDto {
  @IsString()
  studentId!: string;

  @IsString()
  planId!: string;

  @IsOptional()
  @IsString()
  batchId?: string;
}

class RenewSubscriptionDto {
  @IsString()
  subscriptionId!: string;
}

class SelfAssignDto {
  @IsString()
  studentId!: string;

  @IsString()
  planId!: string;

  @IsOptional()
  @IsString()
  batchId?: string;
}

class SelfRenewDto {
  @IsString()
  subscriptionId!: string;
}

@Controller("subscriptions")
@UseGuards(AuthGuard, RolesGuard)
export class SubscriptionsController {
  constructor(
    @Inject(SubscriptionsService)
    private readonly subscriptionsService: SubscriptionsService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  @Get("student/:studentId")
  listForStudent(@Param("studentId") studentId: string) {
    return this.subscriptionsService.listForStudent(studentId);
  }

  @Post("assign")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  assign(@Body() dto: AssignPlanDto) {
    return this.subscriptionsService.assignPlan(
      dto.studentId,
      dto.planId,
      dto.batchId,
    );
  }

  @Post("renew")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  renew(@Body() dto: RenewSubscriptionDto) {
    return this.subscriptionsService.renewManual(dto.subscriptionId);
  }

  @Post("self/assign")
  @Roles(UserRole.STUDENT, UserRole.PARENT)
  async selfAssign(
    @CurrentUser() actor: DecryptedUser,
    @Body() dto: SelfAssignDto,
  ) {
    await this.assertStudentOwnership(actor, dto.studentId);
    return this.subscriptionsService.assignPlan(
      dto.studentId,
      dto.planId,
      dto.batchId,
    );
  }

  @Post("self/renew")
  @Roles(UserRole.STUDENT, UserRole.PARENT)
  async selfRenew(
    @CurrentUser() actor: DecryptedUser,
    @Body() dto: SelfRenewDto,
  ) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: dto.subscriptionId },
    });
    if (!subscription) {
      throw new NotFoundException("Subscription not found");
    }
    await this.assertStudentOwnership(actor, subscription.studentId);
    return this.subscriptionsService.renewManual(dto.subscriptionId);
  }

  private async assertStudentOwnership(
    actor: DecryptedUser,
    studentId: string,
  ) {
    if (actor.role === UserRole.STUDENT) {
      if (actor.id !== studentId) {
        throw new ForbiddenException(
          "Students can only manage their own subscriptions",
        );
      }
      return;
    }
    if (actor.role === UserRole.PARENT) {
      const link = await this.prisma.parentChild.findUnique({
        where: {
          parentUserId_childUserId: {
            parentUserId: actor.id,
            childUserId: studentId,
          },
        },
      });
      if (!link) {
        throw new ForbiddenException(
          "Student is not linked to this parent account",
        );
      }
      return;
    }
    throw new BadRequestException("Unexpected role");
  }
}
