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
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
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

  @Post()
  @Roles(
    UserRole.OWNER,
    UserRole.STAFF,
    UserRole.TRAINER,
    UserRole.STUDENT,
    UserRole.PARENT,
  )
  create(@Body() dto: CreateBookingDto) {
    return this.bookingsService.create(dto);
  }

  @Patch(":id/status")
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.TRAINER)
  updateStatus(@Param("id") id: string, @Body() dto: UpdateBookingStatusDto) {
    return this.bookingsService.updateStatus(id, dto);
  }
}
