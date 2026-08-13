import {
  BadRequestException,
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
import {
  BatchCategory,
  EnrollmentMode,
  MembershipSeatRole,
  type Prisma,
  UserRole,
} from "@prisma/client";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
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
  ValidateNested,
} from "class-validator";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { assertSameStudio } from "../auth/studio-access";
import type { DecryptedUser } from "../users/user-crypto.service";
import { UsersService } from "../users/users.service";
import { BatchCommandsService } from "./application/batch.commands";
import { BatchQueriesService } from "./application/batch.queries";
import { BatchesService } from "./batches.service";
import {
  BatchListQueryDto,
  BatchRosterQueryDto,
  toDiscoverFilters,
} from "./dto/batch-list.dto";

/** Keep DTO classes as values so ValidationPipe can whitelist query params. */
void BatchListQueryDto;
void BatchRosterQueryDto;

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

  @IsArray()
  @IsString({ each: true })
  subscriptionIds!: string[];

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
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  subscriptionIds?: string[];

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

  @IsString()
  subscriptionId!: string;
}

class EnrollStudentsBulkDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  studentIds!: string[];

  @IsString()
  subscriptionId!: string;
}

class SwitchBatchDto {
  @IsString()
  studentId!: string;

  @IsString()
  toBatchId!: string;

  @IsOptional()
  @IsBoolean()
  includeAllPrices?: boolean;
}

class UnenrollStudentDto {
  @IsString()
  studentId!: string;

  @IsOptional()
  @IsBoolean()
  refund?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  refundAmount?: number;
}

class RateBatchDto {
  @IsString()
  studentId!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;
}

class PurchaseCoveredStudentDto {
  @IsString()
  studentId!: string;

  @IsEnum(MembershipSeatRole)
  seatRole!: MembershipSeatRole;

  @IsOptional()
  @IsString()
  batchId?: string;
}

class PurchaseBatchPlanDto {
  @IsString()
  subscriptionId!: string;

  @IsString()
  purchaserUserId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseCoveredStudentDto)
  coveredStudents!: PurchaseCoveredStudentDto[];
}

@Controller("batches")
@UseGuards(AuthGuard, RolesGuard)
export class BatchesController {
  constructor(
    @Inject(BatchesService) private readonly batchesService: BatchesService,
    @Inject(BatchQueriesService)
    private readonly batchQueries: BatchQueriesService,
    @Inject(BatchCommandsService)
    private readonly batchCommands: BatchCommandsService,
    @Inject(UsersService) private readonly usersService: UsersService,
  ) {}

  @Get("studio/:studioId")
  listByStudio(
    @CurrentUser() user: DecryptedUser,
    @Param("studioId") studioId: string,
    @Query() query: BatchListQueryDto,
  ) {
    assertSameStudio(user, studioId);
    return this.batchQueries.listByStudio(studioId, toDiscoverFilters(query), {
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  @Get(":id/revenue")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  getRevenue(@Param("id") id: string, @Query("period") period?: string) {
    if (period != null && period !== "all" && period !== "month") {
      throw new BadRequestException('period must be "all" or "month"');
    }
    return this.batchesService.getRevenue(id, {
      period: period === "month" ? "month" : "all",
    });
  }

  @Get(":id/switch-targets")
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.TRAINER)
  listSwitchTargets(
    @Param("id") id: string,
    @Query("studentId") studentId?: string,
    @Query("includeAllPrices") includeAllPrices?: string,
  ) {
    if (!studentId) {
      throw new BadRequestException("studentId is required");
    }
    return this.batchesService.listSwitchTargets(id, studentId, {
      includeAllPrices: includeAllPrices === "true" || includeAllPrices === "1",
    });
  }

  @Get(":id/unenroll-preview")
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.TRAINER)
  getUnenrollPreview(
    @Param("id") id: string,
    @Query("studentId") studentId?: string,
  ) {
    if (!studentId) {
      throw new BadRequestException("studentId is required");
    }
    return this.batchesService.getUnenrollPreview(id, studentId);
  }

  @Get(":id/roster")
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.TRAINER)
  getRoster(@Param("id") id: string, @Query() query: BatchRosterQueryDto) {
    return this.batchQueries.getRoster(id, {
      cursor: query.cursor,
      limit: query.limit,
      tab: query.tab,
    });
  }

  @Get(":id")
  getById(@Param("id") id: string, @Query("studentId") studentId?: string) {
    return this.batchQueries.getHeader(id, { studentId });
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.TRAINER)
  create(@CurrentUser() user: DecryptedUser, @Body() dto: CreateBatchDto) {
    return this.batchCommands.create(user.id, {
      ...dto,
      scheduleJson: dto.scheduleJson as unknown as Prisma.InputJsonValue,
    });
  }

  @Patch(":id")
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.TRAINER)
  update(@Param("id") id: string, @Body() dto: UpdateBatchDto) {
    return this.batchCommands.update(id, {
      ...dto,
      scheduleJson: dto.scheduleJson as Prisma.InputJsonValue | undefined,
    });
  }

  @Delete(":id")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  remove(@Param("id") id: string) {
    return this.batchCommands.remove(id);
  }

  @Post(":id/purchase")
  @Roles(UserRole.STUDENT, UserRole.PARENT, UserRole.OWNER, UserRole.STAFF)
  async purchase(
    @Param("id") id: string,
    @Body() dto: PurchaseBatchPlanDto,
    @CurrentUser() actor: DecryptedUser,
  ) {
    const staffRoles: UserRole[] = [UserRole.OWNER, UserRole.STAFF];
    if (!staffRoles.includes(actor.role)) {
      await this.assertPurchaserOwnership(actor, dto.purchaserUserId);
      for (const covered of dto.coveredStudents) {
        await this.assertCanCoverStudent(actor, covered.studentId);
      }
    }
    return this.batchCommands.purchase(id, dto);
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
    return this.batchCommands.enroll(
      id,
      dto.studentId,
      actor,
      dto.subscriptionId,
    );
  }

  @Post(":id/enroll-bulk")
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.TRAINER)
  enrollBulk(
    @Param("id") id: string,
    @Body() dto: EnrollStudentsBulkDto,
    @CurrentUser() actor: DecryptedUser,
  ) {
    return this.batchCommands.enrollBulk(
      id,
      dto.studentIds,
      actor,
      dto.subscriptionId,
    );
  }

  @Post(":id/switch")
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.TRAINER)
  switchBatch(@Param("id") id: string, @Body() dto: SwitchBatchDto) {
    return this.batchCommands.switchBatch(id, dto.studentId, dto.toBatchId, {
      includeAllPrices: dto.includeAllPrices === true,
    });
  }

  @Post(":id/unenroll")
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.TRAINER)
  unenroll(@Param("id") id: string, @Body() dto: UnenrollStudentDto) {
    return this.batchCommands.unenroll(id, dto.studentId, {
      refund: dto.refund,
      refundAmount: dto.refundAmount,
    });
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
    return this.batchCommands.rate(id, dto.studentId, dto.rating, actor);
  }

  private async assertPurchaserOwnership(
    actor: DecryptedUser,
    purchaserUserId: string,
  ) {
    if (actor.role === UserRole.STUDENT) {
      if (actor.id !== purchaserUserId) {
        throw new ForbiddenException(
          "Students can only purchase for themselves",
        );
      }
      return;
    }
    if (actor.role === UserRole.PARENT) {
      if (actor.id === purchaserUserId) {
        return;
      }
      throw new ForbiddenException(
        "Parents must be the purchaser on batch purchase",
      );
    }
    throw new BadRequestException("Unexpected role");
  }

  private async assertCanCoverStudent(actor: DecryptedUser, studentId: string) {
    if (actor.id === studentId) {
      return;
    }

    const linked = await this.usersService.isLinkedFamilyMember(
      actor.id,
      studentId,
    );
    if (!linked) {
      throw new ForbiddenException(
        "Student is not linked to this account as a family member",
      );
    }
  }
}
