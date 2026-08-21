import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ContestEntryStatus,
  ContestEntryType,
  ContestStatus,
  UserRole,
} from "@prisma/client";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { FeatureGuard } from "../studio-features/feature.guard";
import { RequireFeature } from "../studio-features/require-feature.decorator";
import type { DecryptedUser } from "../users/user-crypto.service";
import { ContestsService } from "./contests.service";

class CategoryDto {
  @IsString()
  name!: string;

  @IsString()
  danceStyle!: string;

  @IsInt()
  @Min(0)
  ageMin!: number;

  @IsInt()
  @Min(0)
  ageMax!: number;

  @IsEnum(ContestEntryType)
  entryType!: ContestEntryType;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxEntries?: number | null;

  @IsOptional()
  @IsInt()
  @Min(2)
  maxGroupSize?: number | null;

  @IsOptional()
  @IsString()
  certificateTemplateId?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  judgeIds?: string[];
}

class CreateContestDto {
  @IsString()
  studioId!: string;

  @IsOptional()
  @IsString()
  branchId?: string | null;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsOptional()
  @IsDateString()
  registrationOpensAt?: string | null;

  @IsOptional()
  @IsDateString()
  registrationClosesAt?: string | null;

  @IsOptional()
  @IsEnum(ContestStatus)
  status?: ContestStatus;

  @IsOptional()
  @IsBoolean()
  certificationEnabled?: boolean;

  @IsOptional()
  @IsString()
  certificateTemplateId?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryDto)
  categories?: CategoryDto[];
}

class UpdateContestDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  branchId?: string | null;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsDateString()
  registrationOpensAt?: string | null;

  @IsOptional()
  @IsDateString()
  registrationClosesAt?: string | null;

  @IsOptional()
  @IsEnum(ContestStatus)
  status?: ContestStatus;

  @IsOptional()
  @IsBoolean()
  certificationEnabled?: boolean;

  @IsOptional()
  @IsString()
  certificateTemplateId?: string | null;
}

class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  danceStyle?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  ageMin?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  ageMax?: number;

  @IsOptional()
  @IsEnum(ContestEntryType)
  entryType?: ContestEntryType;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxEntries?: number | null;

  @IsOptional()
  @IsInt()
  @Min(2)
  maxGroupSize?: number | null;

  @IsOptional()
  @IsString()
  certificateTemplateId?: string | null;
}

class SetJudgesDto {
  @IsArray()
  @IsString({ each: true })
  judgeIds!: string[];
}

class RegisterEntryDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  studentIds!: string[];

  @IsOptional()
  @IsString()
  teamName?: string | null;
}

class UpdateEntryDto {
  @IsOptional()
  @IsEnum(ContestEntryStatus)
  status?: ContestEntryStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  placement?: number | null;
}

class UpsertScoreDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  score!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}

@Controller("contests")
@UseGuards(AuthGuard, RolesGuard, FeatureGuard)
@RequireFeature("contests")
export class ContestsController {
  constructor(
    @Inject(ContestsService) private readonly contestsService: ContestsService,
  ) {}

  @Get("studio/:studioId")
  listByStudio(
    @CurrentUser() user: DecryptedUser,
    @Param("studioId") studioId: string,
  ) {
    return this.contestsService.listByStudio(user, studioId);
  }

  @Get(":id/entries")
  listEntries(
    @CurrentUser() user: DecryptedUser,
    @Param("id") id: string,
    @Query("categoryId") categoryId?: string,
  ) {
    return this.contestsService.listEntries(user, id, categoryId);
  }

  @Get(":id/scores")
  listScores(@CurrentUser() user: DecryptedUser, @Param("id") id: string) {
    return this.contestsService.listScores(user, id);
  }

  @Get(":id")
  getById(@CurrentUser() user: DecryptedUser, @Param("id") id: string) {
    return this.contestsService.getById(user, id);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.STAFF)
  create(@CurrentUser() user: DecryptedUser, @Body() dto: CreateContestDto) {
    return this.contestsService.create(user, dto);
  }

  @Patch(":id")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  update(
    @CurrentUser() user: DecryptedUser,
    @Param("id") id: string,
    @Body() dto: UpdateContestDto,
  ) {
    return this.contestsService.update(user, id, dto);
  }

  @Delete(":id")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  remove(@CurrentUser() user: DecryptedUser, @Param("id") id: string) {
    return this.contestsService.remove(user, id);
  }

  @Post(":id/categories")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  addCategory(
    @CurrentUser() user: DecryptedUser,
    @Param("id") id: string,
    @Body() dto: CategoryDto,
  ) {
    return this.contestsService.addCategory(user, id, dto);
  }

  @Patch(":id/categories/:categoryId")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  updateCategory(
    @CurrentUser() user: DecryptedUser,
    @Param("id") id: string,
    @Param("categoryId") categoryId: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.contestsService.updateCategory(user, id, categoryId, dto);
  }

  @Delete(":id/categories/:categoryId")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  removeCategory(
    @CurrentUser() user: DecryptedUser,
    @Param("id") id: string,
    @Param("categoryId") categoryId: string,
  ) {
    return this.contestsService.removeCategory(user, id, categoryId);
  }

  @Put("categories/:categoryId/judges")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  setJudges(
    @CurrentUser() user: DecryptedUser,
    @Param("categoryId") categoryId: string,
    @Body() dto: SetJudgesDto,
  ) {
    return this.contestsService.setJudges(user, categoryId, dto.judgeIds);
  }

  @Post("categories/:categoryId/entries")
  @Roles(UserRole.STUDENT, UserRole.PARENT)
  register(
    @CurrentUser() user: DecryptedUser,
    @Param("categoryId") categoryId: string,
    @Body() dto: RegisterEntryDto,
  ) {
    return this.contestsService.register(user, categoryId, dto);
  }

  @Patch("entries/:entryId")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  updateEntry(
    @CurrentUser() user: DecryptedUser,
    @Param("entryId") entryId: string,
    @Body() dto: UpdateEntryDto,
  ) {
    return this.contestsService.updateEntry(user, entryId, dto);
  }

  @Put("entries/:entryId/score")
  @Roles(UserRole.STAFF, UserRole.TRAINER)
  upsertScore(
    @CurrentUser() user: DecryptedUser,
    @Param("entryId") entryId: string,
    @Body() dto: UpsertScoreDto,
  ) {
    return this.contestsService.upsertScore(user, entryId, dto);
  }

  @Delete("entries/:entryId")
  withdraw(
    @CurrentUser() user: DecryptedUser,
    @Param("entryId") entryId: string,
  ) {
    return this.contestsService.withdraw(user, entryId);
  }

  @Post("entries/:entryId/certificate")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  issueCertificate(
    @CurrentUser() user: DecryptedUser,
    @Param("entryId") entryId: string,
  ) {
    return this.contestsService.issueCertificate(user, entryId);
  }
}
