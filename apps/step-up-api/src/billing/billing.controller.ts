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
import { InvoiceStatus, PaymentMethod, UserRole } from "@prisma/client";
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { assertSameStudio } from "../auth/studio-access";
import { PaginationQueryDto } from "../shared/pagination";
import type { DecryptedUser } from "../users/user-crypto.service";
import { BillingCommandsService } from "./application/billing.commands";
import { BillingQueriesService } from "./application/billing.queries";
import { BillingService } from "./billing.service";

class MarkPaidDto {
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsOptional()
  @IsNumber()
  @Min(0)
  referralDiscount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  studioDiscount?: number;
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

class RefundInvoiceDto {
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

class FamilyCombineDto {
  @IsString()
  studioId!: string;

  @IsString()
  purchaserUserId!: string;

  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  invoiceIds!: string[];

  @IsNumber()
  @Min(0)
  familyDiscount!: number;
}

class BillingStudioListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;
}

@Controller("billing")
@UseGuards(AuthGuard, RolesGuard)
export class BillingController {
  constructor(
    @Inject(BillingService) private readonly billingService: BillingService,
    @Inject(BillingQueriesService)
    private readonly billingQueries: BillingQueriesService,
    @Inject(BillingCommandsService)
    private readonly billingCommands: BillingCommandsService,
  ) {}

  @Get("studio/:studioId")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  listByStudio(
    @CurrentUser() user: DecryptedUser,
    @Param("studioId") studioId: string,
    @Query() query: BillingStudioListQueryDto = {},
  ) {
    assertSameStudio(user, studioId);
    return this.billingQueries.listByStudio(studioId, {
      cursor: query?.cursor,
      limit: query?.limit,
      status: query?.status,
    });
  }

  @Post("family-combine")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  familyCombine(
    @CurrentUser() user: DecryptedUser,
    @Body() dto: FamilyCombineDto,
  ) {
    assertSameStudio(user, dto.studioId);
    return this.billingCommands.familyCombine(user, dto);
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
    @Query() query: PaginationQueryDto,
  ) {
    return this.billingQueries.listForStudent(user, studentId, {
      cursor: query.cursor,
      limit: query.limit,
    });
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
    return this.billingCommands.createPaymentOrder(id, user);
  }

  @Post(":id/confirm-payment")
  @Roles(UserRole.STUDENT, UserRole.PARENT)
  confirmPayment(
    @CurrentUser() user: DecryptedUser,
    @Param("id") id: string,
    @Body() dto: ConfirmInvoicePaymentDto,
  ) {
    return this.billingCommands.confirmPayment(id, user, dto);
  }

  @Post(":id/abandon-payment")
  @Roles(UserRole.STUDENT, UserRole.PARENT)
  abandonPayment(@CurrentUser() user: DecryptedUser, @Param("id") id: string) {
    return this.billingCommands.abandonPayment(id, user);
  }

  @Patch(":id/paid")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  markPaid(
    @CurrentUser() user: DecryptedUser,
    @Param("id") id: string,
    @Body() dto: MarkPaidDto,
  ) {
    return this.billingCommands.markPaid(user, id, {
      paymentMethod: dto.paymentMethod,
      referralDiscount: dto.referralDiscount,
      studioDiscount: dto.studioDiscount,
    });
  }

  @Post(":id/refund")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  refund(
    @CurrentUser() user: DecryptedUser,
    @Param("id") id: string,
    @Body() dto: RefundInvoiceDto,
  ) {
    return this.billingCommands.refund(user, id, {
      amount: dto.amount,
      reason: dto.reason,
    });
  }
}
