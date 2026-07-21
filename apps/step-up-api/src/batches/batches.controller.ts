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
import {
  BatchCategory,
  EnrollmentMode,
  type Prisma,
  UserRole,
} from "@prisma/client";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import type { DecryptedUser } from "../users/user-crypto.service";
import { BatchesService } from "./batches.service";

class DanceCategoryDto {
  @IsString()
  name!: string;

  @IsString()
  description!: string;
}

class BatchScheduleDto {
  @IsIn(["DAILY", "WEEKLY"])
  frequency!: "DAILY" | "WEEKLY";

  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  weekdays!: number[];

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime!: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  endTime!: string;

  @IsInt()
  @Min(-840)
  @Max(840)
  utcOffsetMinutes!: number;
}

class CreateBatchDto {
  @IsString()
  studioId!: string;

  @IsString()
  name!: string;

  @IsEnum(BatchCategory)
  category!: BatchCategory;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  monthlyPlanId?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  fullBatchPlanId?: string | null;

  @IsString()
  branchId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  trainerIds!: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DanceCategoryDto)
  danceCategories!: DanceCategoryDto[];

  @IsObject()
  @ValidateNested()
  @Type(() => BatchScheduleDto)
  scheduleJson!: BatchScheduleDto;

  @IsInt()
  @Min(1)
  capacity!: number;

  @IsEnum(EnrollmentMode)
  enrollmentMode!: EnrollmentMode;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  certificationEnabled?: boolean;

  @IsOptional()
  @IsString()
  certificateTemplateId?: string | null;

  @IsOptional()
  @IsString()
  coverImageUrl?: string | null;

  @IsOptional()
  @IsNumber()
  ratingAvg?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  ratingCount?: number;
}

class UpdateBatchDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  monthlyPlanId?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  fullBatchPlanId?: string | null;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  trainerIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DanceCategoryDto)
  danceCategories?: DanceCategoryDto[];

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => BatchScheduleDto)
  scheduleJson?: BatchScheduleDto;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsEnum(EnrollmentMode)
  enrollmentMode?: EnrollmentMode;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  certificationEnabled?: boolean;

  @IsOptional()
  @IsString()
  certificateTemplateId?: string | null;

  @IsOptional()
  @IsString()
  coverImageUrl?: string | null;

  @IsOptional()
  @IsNumber()
  ratingAvg?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  ratingCount?: number;
}

class EnrollStudentDto {
  @IsString()
  studentId!: string;
}

class RateBatchDto {
  @IsString()
  studentId!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;
}

@Controller("batches")
@UseGuards(AuthGuard, RolesGuard)
export class BatchesController {
  constructor(
    @Inject(BatchesService) private readonly batchesService: BatchesService,
  ) {}

  @Get("studio/:studioId")
  listByStudio(
    @Param("studioId") studioId: string,
    @Query("style") style?: string,
    @Query("category") category?: string,
    @Query("trainerId") trainerId?: string,
    @Query("branchId") branchId?: string,
    @Query("search") search?: string,
    @Query("activeOnly") activeOnly?: string,
  ) {
    return this.batchesService.listByStudio(studioId, {
      style,
      category,
      trainerId,
      branchId,
      search,
      activeOnly: activeOnly === "true" || activeOnly === "1",
    });
  }

  @Get(":id/revenue")
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.TRAINER)
  getRevenue(@Param("id") id: string) {
    return this.batchesService.getRevenue(id);
  }

  @Get(":id")
  getById(@Param("id") id: string, @Query("studentId") studentId?: string) {
    return this.batchesService.getById(id, { studentId });
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.TRAINER)
  create(@CurrentUser() user: DecryptedUser, @Body() dto: CreateBatchDto) {
    return this.batchesService.create(user.id, {
      ...dto,
      scheduleJson: dto.scheduleJson as unknown as Prisma.InputJsonValue,
    });
  }

  @Patch(":id")
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.TRAINER)
  update(@Param("id") id: string, @Body() dto: UpdateBatchDto) {
    return this.batchesService.update(id, {
      ...dto,
      scheduleJson: dto.scheduleJson as Prisma.InputJsonValue | undefined,
    });
  }

  @Delete(":id")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  remove(@Param("id") id: string) {
    return this.batchesService.remove(id);
  }

  @Post(":id/enroll")
  @Roles(
    UserRole.OWNER,
    UserRole.STAFF,
    UserRole.TRAINER,
    UserRole.STUDENT,
    UserRole.PARENT,
  )
  enroll(
    @Param("id") id: string,
    @Body() dto: EnrollStudentDto,
    @CurrentUser() actor: DecryptedUser,
  ) {
    return this.batchesService.enroll(id, dto.studentId, actor);
  }

  @Post(":id/rate")
  @Roles(
    UserRole.STUDENT,
    UserRole.PARENT,
    UserRole.OWNER,
    UserRole.STAFF,
    UserRole.TRAINER,
  )
  rate(
    @Param("id") id: string,
    @Body() dto: RateBatchDto,
    @CurrentUser() actor: DecryptedUser,
  ) {
    return this.batchesService.rate(id, dto.studentId, dto.rating, actor);
  }
}
