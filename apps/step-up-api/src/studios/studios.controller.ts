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
  Query,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "../generated/prisma/client";
import { Type } from "class-transformer";
import {
  Allow,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
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
import { AI_PROVIDER_API_VALUES } from "./ai-provider";
import { MarketplaceControlsService } from "./marketplace-controls.service";
import { StudiosService } from "./studios.service";
import { isIncludeTestQuery } from "./test-studio";

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

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(80)
  tagline?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(2000)
  about?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== "")
  @Type(() => Number)
  @IsInt()
  @Min(1950)
  @Max(2100)
  foundedYear?: number | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== "")
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(32)
  whatsapp?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(200)
  instagramUrl?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(300)
  youtubeUrl?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(300)
  websiteUrl?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(500)
  whatToBring?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(200)
  trialBlurb?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];
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
  @IsNumber()
  @Min(0)
  admissionFee?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  timezone?: string;

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

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsIn([...AI_PROVIDER_API_VALUES])
  aiProvider?: (typeof AI_PROVIDER_API_VALUES)[number] | null;

  @IsOptional()
  @IsString()
  aiApiKey?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(128)
  aiChatModel?: string | null;

  @IsOptional()
  @IsBoolean()
  publicStudioListing?: boolean;

  @IsOptional()
  @IsBoolean()
  publicClasses?: boolean;

  @IsOptional()
  @IsBoolean()
  publicTrainers?: boolean;

  @IsOptional()
  @IsBoolean()
  publicRatings?: boolean;

  @IsOptional()
  @IsBoolean()
  bookingTrial?: boolean;

  @IsOptional()
  @IsBoolean()
  bookingEnrollment?: boolean;

  @IsOptional()
  @IsBoolean()
  bookingPrivate?: boolean;

  @IsOptional()
  @IsBoolean()
  bookingFloorHire?: boolean;
}

class AttachTrainerDto {
  @IsString()
  @MinLength(1)
  trainerId!: string;
}

class HireableTrainersQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
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
    @Inject(MarketplaceControlsService)
    private readonly marketplaceControls: MarketplaceControlsService,
  ) {}

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN)
  listStudios() {
    return this.studiosService.listStudios();
  }

  @Get("directory")
  listDirectory(@Query("includeTest") includeTest?: string) {
    return this.studiosService.listDirectory(isIncludeTestQuery(includeTest));
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
        dto.logoUrl !== undefined ||
        dto.photos !== undefined) &&
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
      (dto.aiProvider !== undefined ||
        dto.aiApiKey !== undefined ||
        dto.aiChatModel !== undefined)
    ) {
      throw new ForbiddenException("Only owners can change AI agent settings");
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

    if (
      user.role !== UserRole.OWNER &&
      user.role !== UserRole.SYSTEM_ADMIN &&
      dto.timezone !== undefined
    ) {
      throw new ForbiddenException("Only owners can change timezone");
    }

    if (
      user.role !== UserRole.OWNER &&
      user.role !== UserRole.SYSTEM_ADMIN &&
      dto.admissionFee !== undefined
    ) {
      throw new ForbiddenException("Only owners can change admission fee");
    }

    return this.studiosService.updateSettings(id, dto);
  }

  @Get(":id/marketplace-alerts")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.SYSTEM_ADMIN)
  listMarketplaceAlerts(
    @Param("id") id: string,
    @CurrentUser() user: DecryptedUser,
  ) {
    if (user.role !== UserRole.SYSTEM_ADMIN) {
      assertSameStudio(user, id);
    }
    return this.marketplaceControls.listAlerts(id);
  }

  @Get(":id/hireable-trainers")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.SYSTEM_ADMIN)
  listHireableTrainers(
    @Param("id") id: string,
    @CurrentUser() user: DecryptedUser,
    @Query() query: HireableTrainersQueryDto,
  ) {
    if (user.role !== UserRole.SYSTEM_ADMIN) {
      assertSameStudio(user, id);
    }
    const from = query.from
      ? new Date(query.from)
      : new Date();
    const to = query.to
      ? new Date(query.to)
      : new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
    return this.marketplaceControls.listHireableTrainers(id, from, to);
  }

  @Post(":id/trainer-links")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.SYSTEM_ADMIN)
  attachTrainer(
    @Param("id") id: string,
    @CurrentUser() user: DecryptedUser,
    @Body() dto: AttachTrainerDto,
  ) {
    if (user.role !== UserRole.SYSTEM_ADMIN) {
      assertSameStudio(user, id);
    }
    return this.marketplaceControls.attachTrainer(id, dto.trainerId);
  }

  @Delete(":id/trainer-links/:trainerId")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.SYSTEM_ADMIN)
  detachTrainer(
    @Param("id") id: string,
    @Param("trainerId") trainerId: string,
    @CurrentUser() user: DecryptedUser,
  ) {
    if (user.role !== UserRole.SYSTEM_ADMIN) {
      assertSameStudio(user, id);
    }
    return this.marketplaceControls.detachTrainer(id, trainerId);
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
