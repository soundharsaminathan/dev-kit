import { Controller, Get, Inject, Query, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { IsOptional, IsString } from "class-validator";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import type { DecryptedUser } from "../users/user-crypto.service";
import { JourneyService } from "./journey.service";

class JourneyQueryDto {
  @IsOptional()
  @IsString()
  studentId?: string;
}

@Controller()
@UseGuards(AuthGuard, RolesGuard)
export class JourneyController {
  constructor(
    @Inject(JourneyService) private readonly journey: JourneyService,
  ) {}

  @Get("journey")
  @Roles(UserRole.STUDENT, UserRole.PARENT)
  getJourney(
    @CurrentUser() user: DecryptedUser,
    @Query() query: JourneyQueryDto,
  ) {
    return this.journey.getJourney(user, query.studentId);
  }
}
