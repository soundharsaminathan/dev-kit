import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
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

class UpdateSessionScheduleDto {
  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;
}

class TrialSlotsQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
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
    @Query() query: TrialSlotsQueryDto,
  ) {
    assertSameStudio(user, studioId);
    return this.sessionsService.listTrialSlots(studioId, query.from, query.to);
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
  create(@CurrentUser() user: DecryptedUser, @Body() dto: CreateSessionDto) {
    return this.sessionsService.create(user, dto);
  }

  @Patch(":id/complete")
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.TRAINER)
  complete(@Param("id") id: string) {
    return this.sessionsService.complete(id);
  }

  @Patch(":id")
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.TRAINER)
  updateSchedule(
    @CurrentUser() user: DecryptedUser,
    @Param("id") id: string,
    @Body() dto: UpdateSessionScheduleDto,
  ) {
    return this.sessionsService.updateSchedule(user, id, dto);
  }

  @Delete(":id")
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.TRAINER)
  cancel(@CurrentUser() user: DecryptedUser, @Param("id") id: string) {
    return this.sessionsService.cancel(user, id);
  }
}
