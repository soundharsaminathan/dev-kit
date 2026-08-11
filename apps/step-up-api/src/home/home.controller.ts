import {
  Body,
  Controller,
  Get,
  Inject,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import type { DecryptedUser } from "../users/user-crypto.service";
import { HomeQueriesService } from "./application/home.queries";
import { HomeService } from "./home.service";

class HomeQueryDto {
  @IsOptional()
  @IsString()
  studentId?: string;
}

class UpsertGoalDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  target!: number;

  @IsOptional()
  @IsString()
  studentId?: string;
}

@Controller()
@UseGuards(AuthGuard, RolesGuard)
export class HomeController {
  constructor(
    @Inject(HomeService) private readonly home: HomeService,
    @Inject(HomeQueriesService) private readonly queries: HomeQueriesService,
  ) {}

  @Get("home")
  @Roles(UserRole.STUDENT, UserRole.PARENT)
  getHome(@CurrentUser() user: DecryptedUser, @Query() query: HomeQueryDto) {
    return this.home.getHome(user, query.studentId);
  }

  @Get("goals/me")
  @Roles(UserRole.STUDENT, UserRole.PARENT)
  getGoal(@CurrentUser() user: DecryptedUser, @Query() query: HomeQueryDto) {
    return this.queries.getMonthlyGoal(user, query.studentId);
  }

  @Put("goals/me")
  @Roles(UserRole.STUDENT, UserRole.PARENT)
  upsertGoal(@CurrentUser() user: DecryptedUser, @Body() dto: UpsertGoalDto) {
    return this.queries.upsertMonthlyGoal(user, dto.target, dto.studentId);
  }
}
