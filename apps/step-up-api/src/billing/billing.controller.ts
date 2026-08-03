import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { PaymentMethod, UserRole } from "@prisma/client";
import { IsEnum, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { assertSameStudio } from "../auth/studio-access";
import type { DecryptedUser } from "../users/user-crypto.service";
import { BillingService } from "./billing.service";

class MarkPaidDto {
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;
}

class CreateInvoiceDto {
  @IsString()
  studioId!: string;

  @IsString()
  studentId!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  membershipId?: string;
}

class ConfirmInvoicePaymentDto {
  @IsOptional()
  @IsString()
  razorpay_order_id?: string;

  @IsOptional()
  @IsString()
  razorpay_payment_id?: string;

  @IsOptional()
  @IsString()
  razorpay_signature?: string;
}

@Controller("billing")
@UseGuards(AuthGuard, RolesGuard)
export class BillingController {
  constructor(
    @Inject(BillingService) private readonly billingService: BillingService,
  ) {}

  @Get("studio/:studioId")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  listByStudio(
    @CurrentUser() user: DecryptedUser,
    @Param("studioId") studioId: string,
  ) {
    assertSameStudio(user, studioId);
    return this.billingService.listByStudio(studioId);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.STAFF)
  create(@CurrentUser() user: DecryptedUser, @Body() dto: CreateInvoiceDto) {
    return this.billingService.createPendingInvoice(user, dto);
  }

  @Get("analytics/trainer/:trainerId")
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.TRAINER)
  trainerAnalytics(
    @CurrentUser() user: DecryptedUser,
    @Param("trainerId") trainerId: string,
    @Query("studioId") studioId: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("bucket") bucket?: string,
  ) {
    if (!studioId) {
      throw new BadRequestException("studioId is required");
    }

    assertSameStudio(user, studioId);

    if (
      bucket !== undefined &&
      bucket !== "day" &&
      bucket !== "week" &&
      bucket !== "month"
    ) {
      throw new BadRequestException("bucket must be day, week, or month");
    }

    return this.billingService.getTrainerAnalytics(user, trainerId, studioId, {
      ...(from !== undefined ? { from } : {}),
      ...(to !== undefined ? { to } : {}),
      ...(bucket === "day" || bucket === "week" || bucket === "month"
        ? { bucket }
        : {}),
    });
  }

  @Get("student/:studentId")
  @Roles(
    UserRole.OWNER,
    UserRole.STAFF,
    UserRole.TRAINER,
    UserRole.STUDENT,
    UserRole.PARENT,
  )
  listForStudent(
    @CurrentUser() user: DecryptedUser,
    @Param("studentId") studentId: string,
  ) {
    return this.billingService.listForStudent(user, studentId);
  }

  @Get(":id")
  @Roles(
    UserRole.OWNER,
    UserRole.STAFF,
    UserRole.TRAINER,
    UserRole.STUDENT,
    UserRole.PARENT,
  )
  getOne(@CurrentUser() user: DecryptedUser, @Param("id") id: string) {
    return this.billingService.getCheckoutInvoice(id, user);
  }

  @Post(":id/create-payment-order")
  @Roles(UserRole.STUDENT, UserRole.PARENT)
  createPaymentOrder(
    @CurrentUser() user: DecryptedUser,
    @Param("id") id: string,
  ) {
    return this.billingService.createInvoicePaymentOrder(id, user);
  }

  @Post(":id/confirm-payment")
  @Roles(UserRole.STUDENT, UserRole.PARENT)
  confirmPayment(
    @CurrentUser() user: DecryptedUser,
    @Param("id") id: string,
    @Body() dto: ConfirmInvoicePaymentDto,
  ) {
    return this.billingService.confirmInvoicePayment(id, user, dto);
  }

  @Post(":id/abandon-payment")
  @Roles(UserRole.STUDENT, UserRole.PARENT)
  abandonPayment(@CurrentUser() user: DecryptedUser, @Param("id") id: string) {
    return this.billingService.abandonInvoicePayment(id, user);
  }

  @Patch(":id/paid")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  markPaid(
    @CurrentUser() user: DecryptedUser,
    @Param("id") id: string,
    @Body() dto: MarkPaidDto,
  ) {
    return this.billingService.markPaid(user, id, dto.paymentMethod);
  }
}
