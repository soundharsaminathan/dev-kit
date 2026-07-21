import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Inject,
  Param,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { IsNumber, IsOptional, IsString } from "class-validator";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import type { DecryptedUser } from "../users/user-crypto.service";
import { StudiosService } from "./studios.service";

class UpdateStudioDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  contact?: string;
}

class UpdateStudioSettingsDto {
  @IsOptional()
  @IsNumber()
  graceDays?: number;

  @IsOptional()
  @IsNumber()
  expireAlertDays?: number;

  @IsOptional()
  @IsNumber()
  platformFeePercent?: number;
}

@Controller("studios")
export class StudiosController {
  constructor(
    @Inject(StudiosService) private readonly studiosService: StudiosService,
  ) {}

  @Get(":id/public")
  getPublicProfile(@Param("id") id: string) {
    return this.studiosService.getPublicProfile(id);
  }

  @Get(":id")
  @UseGuards(AuthGuard, RolesGuard)
  getStudio(@Param("id") id: string) {
    return this.studiosService.getStudio(id);
  }

  @Patch(":id")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.STAFF)
  updateStudio(@Param("id") id: string, @Body() dto: UpdateStudioDto) {
    return this.studiosService.updateStudio(id, dto);
  }

  @Patch(":id/settings")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.STAFF)
  updateSettings(
    @Param("id") id: string,
    @CurrentUser() user: DecryptedUser,
    @Body() dto: UpdateStudioSettingsDto,
  ) {
    if (user.role !== UserRole.OWNER && dto.platformFeePercent !== undefined) {
      throw new ForbiddenException(
        "Only owners can change platform fee percent",
      );
    }

    return this.studiosService.updateSettings(id, dto);
  }

  @Delete(":id")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  deleteStudio(@Param("id") id: string, @CurrentUser() user: DecryptedUser) {
    if (user.role !== UserRole.OWNER) {
      throw new ForbiddenException("Only owners can delete a studio");
    }

    return this.studiosService.deleteStudio(id);
  }
}
