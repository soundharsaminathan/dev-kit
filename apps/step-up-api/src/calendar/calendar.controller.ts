import { Controller, Get, Inject, Query, UseGuards } from "@nestjs/common";
import { IsDateString, IsOptional, IsString } from "class-validator";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { RolesGuard } from "../auth/roles.guard";
import type { DecryptedUser } from "../users/user-crypto.service";
import { CalendarService } from "./calendar.service";

class CalendarEventsQueryDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  @IsOptional()
  @IsString()
  studioId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  trainerId?: string;

  @IsOptional()
  @IsString()
  studentId?: string;
}

class UnscheduledQueryDto {
  @IsOptional()
  @IsString()
  studioId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  trainerId?: string;

  @IsOptional()
  @IsString()
  studentId?: string;
}

@Controller("calendar")
@UseGuards(AuthGuard, RolesGuard)
export class CalendarController {
  constructor(
    @Inject(CalendarService) private readonly calendarService: CalendarService,
  ) {}

  @Get("events/unscheduled")
  listUnscheduled(
    @CurrentUser() user: DecryptedUser,
    @Query() query: UnscheduledQueryDto,
  ) {
    return this.calendarService.listUnscheduled(user, query);
  }

  @Get("events")
  listEvents(
    @CurrentUser() user: DecryptedUser,
    @Query() query: CalendarEventsQueryDto,
  ) {
    return this.calendarService.listEvents(user, query);
  }
}
