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
import { SessionType, UserRole } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsString } from "class-validator";
import { AttendanceService } from "../attendance/attendance.service";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { assertSameStudio } from "../auth/studio-access";
import type { DecryptedUser } from "../users/user-crypto.service";
import { SessionsService } from "./sessions.service";

class CreateSessionDto {
  @IsString()
  batchId!: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsOptional()
  @IsEnum(SessionType)
  type?: SessionType;
}

@Controller("sessions")
@UseGuards(AuthGuard, RolesGuard)
export class SessionsController {
  constructor(
    @Inject(SessionsService) private readonly sessionsService: SessionsService,
    @Inject(AttendanceService)
    private readonly attendanceService: AttendanceService,
  ) {}

  @Get("batch/:batchId")
  listByBatch(@Param("batchId") batchId: string) {
    return this.sessionsService.listByBatch(batchId);
  }

  @Get("studio/:studioId/trial")
  listTrialSlots(
    @CurrentUser() user: DecryptedUser,
    @Param("studioId") studioId: string,
  ) {
    assertSameStudio(user, studioId);
    return this.sessionsService.listTrialSlots(studioId);
  }

  @Get(":id")
  getById(@Param("id") id: string) {
    return this.sessionsService.getById(id);
  }

  @Get(":id/qr")
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.TRAINER)
  qrToken(@Param("id") id: string) {
    return this.attendanceService.createSessionQrToken(id);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.TRAINER)
  create(@Body() dto: CreateSessionDto) {
    return this.sessionsService.create(dto);
  }

  @Patch(":id/complete")
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.TRAINER)
  complete(@Param("id") id: string) {
    return this.sessionsService.complete(id);
  }
}
