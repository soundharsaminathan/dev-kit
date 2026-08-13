import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import {
  Allow,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { assertSameStudio } from "../auth/studio-access";
import type { DecryptedUser } from "../users/user-crypto.service";
import { UsersService } from "../users/users.service";
import { StudiosService } from "./studios.service";

class CreateStudioDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  contact?: string;

  @IsEmail()
  ownerEmail!: string;

  @IsOptional()
  @IsString()
  ownerName?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  temporaryPassword?: string;
}

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

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  logoUrl?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  heroMobileUrl?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  heroDesktopUrl?: string | null;
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
  @Min(0)
  @Max(100)
  platformFeePercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  gstPercent?: number;

  @IsOptional()
  @IsString()
  razorpayKeyId?: string | null;

  @IsOptional()
  @IsString()
  razorpayKeySecret?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(20)
  gstNumber?: string | null;

  @IsOptional()
  @Allow()
  danceStyles?: unknown;
}

class ResetOwnerPasswordDto {
  @IsOptional()
  @IsString()
  @MinLength(8)
  temporaryPassword?: string;
}

@Controller("studios")
export class StudiosController {
  constructor(
    @Inject(StudiosService) private readonly studiosService: StudiosService,
    @Inject(UsersService) private readonly usersService: UsersService,
  ) {}

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN)
  listStudios() {
    return this.studiosService.listStudios();
  }

  @Get("directory")
  listDirectory() {
    return this.studiosService.listDirectory();
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN)
  createStudio(@Body() dto: CreateStudioDto) {
    return this.studiosService.createStudio(dto);
  }

  @Get(":id/public")
  getPublicProfile(@Param("id") id: string) {
    return this.studiosService.getPublicProfile(id);
  }

  @Get(":id")
  @UseGuards(AuthGuard, RolesGuard)
  getStudio(@Param("id") id: string, @CurrentUser() user: DecryptedUser) {
    if (user.role !== UserRole.SYSTEM_ADMIN) {
      assertSameStudio(user, id);
    }
    return this.studiosService.getStudio(id);
  }

  @Patch(":id")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.SYSTEM_ADMIN)
  updateStudio(
    @Param("id") id: string,
    @CurrentUser() user: DecryptedUser,
    @Body() dto: UpdateStudioDto,
  ) {
    if (user.role !== UserRole.SYSTEM_ADMIN) {
      assertSameStudio(user, id);
    }
    if (
      (dto.heroMobileUrl !== undefined ||
        dto.heroDesktopUrl !== undefined ||
        dto.logoUrl !== undefined) &&
      user.role !== UserRole.OWNER &&
      user.role !== UserRole.SYSTEM_ADMIN
    ) {
      throw new ForbiddenException("Only owners can change studio branding");
    }

    return this.studiosService.updateStudio(id, dto);
  }

  @Patch(":id/settings")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.SYSTEM_ADMIN)
  updateSettings(
    @Param("id") id: string,
    @CurrentUser() user: DecryptedUser,
    @Body() dto: UpdateStudioSettingsDto,
  ) {
    if (user.role !== UserRole.SYSTEM_ADMIN) {
      assertSameStudio(user, id);
    }
    if (
      user.role !== UserRole.OWNER &&
      user.role !== UserRole.SYSTEM_ADMIN &&
      dto.graceDays !== undefined
    ) {
      throw new ForbiddenException("Only owners can change due days");
    }

    if (
      user.role !== UserRole.SYSTEM_ADMIN &&
      dto.platformFeePercent !== undefined
    ) {
      throw new ForbiddenException(
        "Only system admins can change platform fee percent",
      );
    }

    if (
      user.role !== UserRole.OWNER &&
      user.role !== UserRole.SYSTEM_ADMIN &&
      (dto.razorpayKeyId !== undefined || dto.razorpayKeySecret !== undefined)
    ) {
      throw new ForbiddenException("Only owners can change Razorpay keys");
    }

    if (
      user.role !== UserRole.OWNER &&
      user.role !== UserRole.SYSTEM_ADMIN &&
      dto.gstNumber !== undefined
    ) {
      throw new ForbiddenException("Only owners can change GST number");
    }

    if (
      user.role !== UserRole.OWNER &&
      user.role !== UserRole.SYSTEM_ADMIN &&
      dto.gstPercent !== undefined
    ) {
      throw new ForbiddenException("Only owners can change GST percent");
    }

    if (
      user.role !== UserRole.OWNER &&
      user.role !== UserRole.SYSTEM_ADMIN &&
      dto.danceStyles !== undefined
    ) {
      throw new ForbiddenException("Only owners can change dance styles");
    }

    return this.studiosService.updateSettings(id, dto);
  }

  @Post(":id/reset-owner-password")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN)
  resetOwnerPassword(
    @Param("id") id: string,
    @Body() dto: ResetOwnerPasswordDto,
  ) {
    return this.usersService.resetOwnerTemporaryPassword(
      id,
      dto.temporaryPassword,
    );
  }

  @Delete(":id")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.SYSTEM_ADMIN)
  deleteStudio(@Param("id") id: string, @CurrentUser() user: DecryptedUser) {
    if (user.role === UserRole.OWNER) {
      assertSameStudio(user, id);
    }

    return this.studiosService.deleteStudio(id);
  }
}
