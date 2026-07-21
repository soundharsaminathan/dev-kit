import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AttendanceSource, AttendanceStatus, UserRole } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import type { DecryptedUser } from "../users/user-crypto.service";
import { AttendanceService } from "./attendance.service";

class MarkAttendanceDto {
  @IsString()
  sessionId!: string;

  @IsString()
  studentId!: string;

  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;

  @IsEnum(AttendanceSource)
  source!: AttendanceSource;
}

class VerifyQrDto {
  @IsString()
  token!: string;

  @IsString()
  @IsOptional()
  studentId?: string;
}

@Controller("attendance")
@UseGuards(AuthGuard, RolesGuard)
export class AttendanceController {
  constructor(
    @Inject(AttendanceService)
    private readonly attendanceService: AttendanceService,
  ) {}

  @Get("session/:sessionId")
  listBySession(@Param("sessionId") sessionId: string) {
    return this.attendanceService.listBySession(sessionId);
  }

  @Get("session/:sessionId/roster")
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.TRAINER)
  sessionRoster(@Param("sessionId") sessionId: string) {
    return this.attendanceService.getSessionRoster(sessionId);
  }

  @Post("session/:sessionId/mark-all-present")
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.TRAINER)
  markAllPresent(
    @Param("sessionId") sessionId: string,
    @CurrentUser() user: DecryptedUser,
  ) {
    return this.attendanceService.markAllPresent(sessionId, user.id);
  }

  @Post("mark")
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.TRAINER)
  mark(@CurrentUser() user: DecryptedUser, @Body() dto: MarkAttendanceDto) {
    return this.attendanceService.markAttendance({
      ...dto,
      markedById: user.id,
    });
  }

  @Post("qr/verify")
  verifyQr(@CurrentUser() user: DecryptedUser, @Body() dto: VerifyQrDto) {
    return this.attendanceService.verifyQrAndMark(
      dto.token,
      user.id,
      user.role,
      dto.studentId,
    );
  }
}
