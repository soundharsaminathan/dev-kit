import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { BookingStatus, BookingType, UserRole } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsString } from "class-validator";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import type { DecryptedUser } from "../users/user-crypto.service";
import { BookingsService } from "./bookings.service";

class CreateBookingDto {
  @IsString()
  studioId!: string;

  @IsString()
  studentId!: string;

  @IsEnum(BookingType)
  type!: BookingType;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  trainerId?: string;

  @IsOptional()
  @IsString()
  batchId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;
}

class UpdateBookingStatusDto {
  @IsEnum(BookingStatus)
  status!: BookingStatus;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsString()
  trainerId?: string;
}

class ConfirmPaymentDto {
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

class CancelBookingDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

class RequestRescheduleDto {
  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

@Controller("bookings")
@UseGuards(AuthGuard, RolesGuard)
export class BookingsController {
  constructor(
    @Inject(BookingsService) private readonly bookingsService: BookingsService,
  ) {}

  @Get("student/:studentId")
  listForStudent(@Param("studentId") studentId: string) {
    return this.bookingsService.listForStudent(studentId);
  }

  @Get("studio/:studioId")
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.TRAINER)
  listForStudio(@Param("studioId") studioId: string) {
    return this.bookingsService.listForStudio(studioId);
  }

  @Get(":id")
  @Roles(
    UserRole.OWNER,
    UserRole.STAFF,
    UserRole.TRAINER,
    UserRole.STUDENT,
    UserRole.PARENT,
  )
  getById(@Param("id") id: string, @CurrentUser() user: DecryptedUser) {
    return this.bookingsService.getById(id, user);
  }

  @Post()
  @Roles(
    UserRole.OWNER,
    UserRole.STAFF,
    UserRole.TRAINER,
    UserRole.STUDENT,
    UserRole.PARENT,
  )
  create(@CurrentUser() user: DecryptedUser, @Body() dto: CreateBookingDto) {
    const requirePayment =
      user.role === UserRole.STUDENT || user.role === UserRole.PARENT;
    return this.bookingsService.create(dto, { requirePayment });
  }

  @Post(":id/create-payment-order")
  @Roles(UserRole.STUDENT, UserRole.PARENT)
  createPaymentOrder(
    @Param("id") id: string,
    @CurrentUser() user: DecryptedUser,
  ) {
    return this.bookingsService.createPaymentOrder(id, user);
  }

  @Post(":id/confirm-payment")
  @Roles(UserRole.STUDENT, UserRole.PARENT)
  confirmPayment(
    @Param("id") id: string,
    @CurrentUser() user: DecryptedUser,
    @Body() dto: ConfirmPaymentDto,
  ) {
    return this.bookingsService.confirmPayment(id, user, dto ?? {});
  }

  @Post(":id/abandon-payment")
  @Roles(UserRole.STUDENT, UserRole.PARENT)
  abandonPayment(@Param("id") id: string, @CurrentUser() user: DecryptedUser) {
    return this.bookingsService.abandonPayment(id, user);
  }

  @Post(":id/cancel")
  @Roles(UserRole.STUDENT, UserRole.PARENT)
  cancelBooking(
    @Param("id") id: string,
    @CurrentUser() user: DecryptedUser,
    @Body() dto: CancelBookingDto,
  ) {
    return this.bookingsService.cancelBooking(id, user, dto?.reason);
  }

  @Post(":id/request-reschedule")
  @Roles(UserRole.STUDENT, UserRole.PARENT)
  requestReschedule(
    @Param("id") id: string,
    @CurrentUser() user: DecryptedUser,
    @Body() dto: RequestRescheduleDto,
  ) {
    return this.bookingsService.requestReschedule(id, user, dto ?? {});
  }

  @Patch(":id/status")
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.TRAINER)
  updateStatus(@Param("id") id: string, @Body() dto: UpdateBookingStatusDto) {
    return this.bookingsService.updateStatus(id, dto);
  }
}
