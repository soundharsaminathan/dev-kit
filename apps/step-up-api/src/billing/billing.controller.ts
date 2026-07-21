import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { PaymentMethod, UserRole } from "@prisma/client";
import { IsEnum } from "class-validator";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import type { DecryptedUser } from "../users/user-crypto.service";
import { BillingService } from "./billing.service";

class MarkPaidDto {
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;
}

@Controller("billing")
@UseGuards(AuthGuard, RolesGuard)
export class BillingController {
  constructor(
    @Inject(BillingService) private readonly billingService: BillingService,
  ) {}

  @Get("studio/:studioId")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  listByStudio(@Param("studioId") studioId: string) {
    return this.billingService.listByStudio(studioId);
  }

  @Get("analytics/trainer/:trainerId")
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.TRAINER)
  trainerAnalytics(
    @CurrentUser() user: DecryptedUser,
    @Param("trainerId") trainerId: string,
    @Query("studioId") studioId: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    if (!studioId) {
      throw new BadRequestException("studioId is required");
    }

    return this.billingService.getTrainerAnalytics(user, trainerId, studioId, {
      ...(from !== undefined ? { from } : {}),
      ...(to !== undefined ? { to } : {}),
    });
  }

  @Get("student/:studentId")
  listForStudent(@Param("studentId") studentId: string) {
    return this.billingService.listForStudent(studentId);
  }

  @Patch(":id/paid")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  markPaid(@Param("id") id: string, @Body() dto: MarkPaidDto) {
    return this.billingService.markPaid(id, dto.paymentMethod);
  }
}
