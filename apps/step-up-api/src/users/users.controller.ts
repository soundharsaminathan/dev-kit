import {
  BadRequestException,
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
  AgeRange,
  ExperienceLevel,
  FamilyMemberKind,
  Gender,
  ProfileVisibility,
  UserRole,
} from "@prisma/client";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { assertSameStudio } from "../auth/studio-access";
import { SocialService } from "../social/social.service";
import {
  isLeadDateFilter,
  LEAD_DATE_FILTERS,
  type LeadDateFilter,
} from "./leads";
import {
  isStudentFunnelPeriod,
  isStudentFunnelStage,
  STUDENT_FUNNEL_PERIODS,
  STUDENT_FUNNEL_STAGES,
  type StudentFunnelPeriod,
  type StudentFunnelStage,
} from "./student-funnel";
import type { DecryptedUser } from "./user-crypto.service";
import { UsersService } from "./users.service";

class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  bannerUrl?: string;

  @IsOptional()
  @IsString()
  coverUrl?: string;

  @IsOptional()
  @IsString()
  instagramUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  styles?: string[];

  @IsOptional()
  @IsEnum(ExperienceLevel)
  experienceLevel?: ExperienceLevel;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scheduleVibe?: string[];

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsEnum(AgeRange)
  ageRange?: AgeRange;

  @IsOptional()
  @IsString()
  preferredBranchId?: string | null;

  @IsOptional()
  @IsEnum(ProfileVisibility)
  profileVisibility?: ProfileVisibility;
}

class CompleteOnboardingDto {
  @IsOptional()
  @IsBoolean()
  personalTrial?: boolean;

  @IsOptional()
  @IsString()
  batchId?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  trainerId?: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;
}

class LinkParentChildDto {
  @IsString()
  parentUserId!: string;

  @IsString()
  childUserId!: string;
}

class LinkStudioFamilyDto {
  @IsString()
  @IsNotEmpty()
  anchorUserId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  memberUserIds!: string[];
}

class LinkChildByEmailDto {
  @IsEmail()
  email!: string;
}

class UpdateStudioStudentDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

class ResetTemporaryPasswordDto {
  @IsOptional()
  @IsString()
  temporaryPassword?: string;
}

class CreateStudentDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsEnum(Gender)
  gender!: Gender;

  @IsEnum(AgeRange)
  ageRange!: AgeRange;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  styles?: string[];

  @IsOptional()
  @IsString()
  batchId?: string;

  @IsOptional()
  @IsString()
  temporaryPassword?: string;
}

class CreateTrainerDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsEnum(Gender)
  gender!: Gender;

  @IsEnum(AgeRange)
  ageRange!: AgeRange;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  styles?: string[];

  @IsOptional()
  @IsString()
  temporaryPassword?: string;
}

class BulkStudentDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsEnum(Gender)
  gender!: Gender;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(120)
  age!: number;

  @IsOptional()
  @IsString()
  phone?: string;
}

class BulkCreateStudentsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => BulkStudentDto)
  students!: BulkStudentDto[];
}

class CreateFamilyMemberDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(FamilyMemberKind)
  kind!: FamilyMemberKind;

  @IsEnum(Gender)
  gender!: Gender;

  @IsEnum(AgeRange)
  ageRange!: AgeRange;
}

class CreateLeadDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsEnum(AgeRange)
  ageRange!: AgeRange;

  @IsOptional()
  @IsString()
  sessionId?: string;
}

@Controller("users")
@UseGuards(AuthGuard, RolesGuard)
export class UsersController {
  constructor(
    @Inject(UsersService) private readonly usersService: UsersService,
    @Inject(SocialService) private readonly socialService: SocialService,
  ) {}

  @Get("me")
  getMe(@CurrentUser() user: DecryptedUser) {
    return user;
  }

  @Post("me/onboarding/complete")
  @Roles(UserRole.STUDENT)
  completeOnboarding(
    @CurrentUser() user: DecryptedUser,
    @Body() dto?: CompleteOnboardingDto,
  ) {
    return this.usersService.completeOnboarding(user.id, dto ?? {});
  }

  @Get("me/follow-requests")
  listFollowRequests(@CurrentUser() user: DecryptedUser) {
    return this.socialService.listFollowRequests(user.id);
  }

  @Post("me/follow-requests/:requestId/accept")
  acceptFollowRequest(
    @CurrentUser() user: DecryptedUser,
    @Param("requestId") requestId: string,
  ) {
    return this.socialService.acceptFollowRequest(user.id, requestId);
  }

  @Post("me/follow-requests/:requestId/reject")
  rejectFollowRequest(
    @CurrentUser() user: DecryptedUser,
    @Param("requestId") requestId: string,
  ) {
    return this.socialService.rejectFollowRequest(user.id, requestId);
  }

  @Get("me/family-members")
  @Roles(UserRole.STUDENT, UserRole.PARENT)
  listFamilyMembers(@CurrentUser() user: DecryptedUser) {
    return this.usersService.listFamilyMembers(user.id);
  }

  @Post("me/family-members")
  @Roles(UserRole.STUDENT, UserRole.PARENT)
  createFamilyMember(
    @CurrentUser() user: DecryptedUser,
    @Body() dto: CreateFamilyMemberDto,
  ) {
    return this.usersService.createFamilyMember(user, dto);
  }

  @Delete("me/family-members/:memberUserId")
  @Roles(UserRole.STUDENT, UserRole.PARENT)
  removeFamilyMember(
    @CurrentUser() user: DecryptedUser,
    @Param("memberUserId") memberUserId: string,
  ) {
    return this.usersService.removeFamilyMember(user.id, memberUserId);
  }

  @Post("me/link-child")
  @Roles(UserRole.PARENT)
  linkChildByEmail(
    @CurrentUser() user: DecryptedUser,
    @Body() dto: LinkChildByEmailDto,
  ) {
    return this.usersService.linkChildByEmail(user, dto.email);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.STAFF)
  createStudent(
    @CurrentUser() user: DecryptedUser,
    @Body() dto: CreateStudentDto,
  ) {
    if (!user.studioId) {
      throw new BadRequestException("User is not assigned to a studio");
    }

    return this.usersService.createStudent({
      ...dto,
      studioId: user.studioId,
    });
  }

  @Post("trainers")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  createTrainer(
    @CurrentUser() user: DecryptedUser,
    @Body() dto: CreateTrainerDto,
  ) {
    if (!user.studioId) {
      throw new BadRequestException("User is not assigned to a studio");
    }

    return this.usersService.createTrainer({
      ...dto,
      studioId: user.studioId,
    });
  }

  @Post("bulk")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  createStudents(
    @CurrentUser() user: DecryptedUser,
    @Body() dto: BulkCreateStudentsDto,
  ) {
    if (!user.studioId) {
      throw new BadRequestException("User is not assigned to a studio");
    }

    return this.usersService.createStudents(user.studioId, dto.students);
  }

  @Get("studio/:studioId")
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.TRAINER)
  listByStudio(
    @CurrentUser() user: DecryptedUser,
    @Param("studioId") studioId: string,
  ) {
    assertSameStudio(user, studioId);
    return this.usersService.listByStudio(studioId);
  }

  @Get("studio/:studioId/families")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  listStudioFamilies(
    @CurrentUser() user: DecryptedUser,
    @Param("studioId") studioId: string,
  ) {
    assertSameStudio(user, studioId);
    return this.usersService.listStudioFamilies(studioId);
  }

  @Post("studio/:studioId/families/link")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  linkStudioFamily(
    @CurrentUser() user: DecryptedUser,
    @Param("studioId") studioId: string,
    @Body() dto: LinkStudioFamilyDto,
  ) {
    assertSameStudio(user, studioId);
    return this.usersService.linkStudioFamily(studioId, dto);
  }

  @Get("studio/:studioId/students")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  listStudents(
    @CurrentUser() user: DecryptedUser,
    @Param("studioId") studioId: string,
    @Query("q") q?: string,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string,
    @Query("includeParents") includeParents?: string,
  ) {
    assertSameStudio(user, studioId);
    const parsedLimit = limit ? Number(limit) : undefined;
    return this.usersService.listStudents(studioId, {
      q,
      cursor,
      ...(Number.isFinite(parsedLimit) ? { limit: parsedLimit } : {}),
      includeParents: includeParents === "true" || includeParents === "1",
    });
  }

  @Get("studio/:studioId/student-directory")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  listStudentDirectory(
    @CurrentUser() user: DecryptedUser,
    @Param("studioId") studioId: string,
    @Query("stage") stage?: string,
    @Query("period") period?: string,
  ) {
    assertSameStudio(user, studioId);
    if (stage !== undefined && !isStudentFunnelStage(stage)) {
      throw new BadRequestException(
        `Invalid stage. Expected one of: ${STUDENT_FUNNEL_STAGES.join(", ")}`,
      );
    }
    if (period !== undefined && !isStudentFunnelPeriod(period)) {
      throw new BadRequestException(
        `Invalid period. Expected one of: ${STUDENT_FUNNEL_PERIODS.join(", ")}`,
      );
    }

    return this.usersService.listStudentDirectory(studioId, {
      stage: stage as StudentFunnelStage | undefined,
      period: (period as StudentFunnelPeriod | undefined) ?? "lifetime",
    });
  }

  @Get("studio/:studioId/student-funnel")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  getStudentFunnel(
    @CurrentUser() user: DecryptedUser,
    @Param("studioId") studioId: string,
    @Query("period") period?: string,
  ) {
    assertSameStudio(user, studioId);
    if (period !== undefined && !isStudentFunnelPeriod(period)) {
      throw new BadRequestException(
        `Invalid period. Expected one of: ${STUDENT_FUNNEL_PERIODS.join(", ")}`,
      );
    }

    return this.usersService.getStudentFunnel(
      studioId,
      (period as StudentFunnelPeriod | undefined) ?? "lifetime",
    );
  }

  @Get("studio/:studioId/leads")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  listLeads(
    @CurrentUser() user: DecryptedUser,
    @Param("studioId") studioId: string,
    @Query("filter") filter?: string,
  ) {
    assertSameStudio(user, studioId);
    if (filter !== undefined && !isLeadDateFilter(filter)) {
      throw new BadRequestException(
        `Invalid filter. Expected one of: ${LEAD_DATE_FILTERS.join(", ")}`,
      );
    }

    return this.usersService.listLeads(studioId, {
      filter: (filter as LeadDateFilter | undefined) ?? "all",
    });
  }

  @Post("studio/:studioId/leads")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  createLead(
    @CurrentUser() user: DecryptedUser,
    @Param("studioId") studioId: string,
    @Body() dto: CreateLeadDto,
  ) {
    assertSameStudio(user, studioId);
    return this.usersService.createLead(studioId, dto);
  }

  @Get("studio/:studioId/students/:studentId")
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.TRAINER)
  getStudentStudioProfile(
    @CurrentUser() user: DecryptedUser,
    @Param("studioId") studioId: string,
    @Param("studentId") studentId: string,
  ) {
    assertSameStudio(user, studioId);
    return this.usersService.getStudentStudioProfile(studioId, studentId);
  }

  @Patch("studio/:studioId/students/:studentId")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  updateStudioStudent(
    @CurrentUser() user: DecryptedUser,
    @Param("studioId") studioId: string,
    @Param("studentId") studentId: string,
    @Body() dto: UpdateStudioStudentDto,
  ) {
    assertSameStudio(user, studioId);
    return this.usersService.updateStudioStudent(studioId, studentId, dto);
  }

  @Delete("studio/:studioId/students/:studentId")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  deleteStudent(
    @CurrentUser() user: DecryptedUser,
    @Param("studioId") studioId: string,
    @Param("studentId") studentId: string,
  ) {
    assertSameStudio(user, studioId);
    return this.usersService.deleteStudent(studioId, studentId);
  }

  @Post("studio/:studioId/students/:studentId/reset-password")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  resetStudentPassword(
    @CurrentUser() user: DecryptedUser,
    @Param("studioId") studioId: string,
    @Param("studentId") studentId: string,
    @Body() dto: ResetTemporaryPasswordDto,
  ) {
    assertSameStudio(user, studioId);
    return this.usersService.resetStudentTemporaryPassword(
      studioId,
      studentId,
      dto.temporaryPassword,
    );
  }

  @Post("studio/:studioId/trainers/:trainerId/reset-password")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  resetTrainerPassword(
    @CurrentUser() user: DecryptedUser,
    @Param("studioId") studioId: string,
    @Param("trainerId") trainerId: string,
    @Body() dto: ResetTemporaryPasswordDto,
  ) {
    assertSameStudio(user, studioId);
    return this.usersService.resetTrainerTemporaryPassword(
      studioId,
      trainerId,
      dto.temporaryPassword,
    );
  }

  @Get("studio/:studioId/trainers")
  listStudioTrainers(
    @CurrentUser() user: DecryptedUser,
    @Param("studioId") studioId: string,
  ) {
    assertSameStudio(user, studioId);
    return this.socialService.listStudioTrainers(user.id, studioId);
  }

  @Get(":id/profile")
  getProfile(@CurrentUser() user: DecryptedUser, @Param("id") id: string) {
    return this.socialService.getProfile(user.id, id);
  }

  @Post(":id/follow")
  follow(@CurrentUser() user: DecryptedUser, @Param("id") id: string) {
    return this.socialService.follow(user, id);
  }

  @Delete(":id/follow")
  unfollow(@CurrentUser() user: DecryptedUser, @Param("id") id: string) {
    return this.socialService.unfollow(user.id, id);
  }

  @Get(":id")
  getById(@Param("id") id: string) {
    return this.usersService.findById(id);
  }

  @Patch("me")
  updateMe(@CurrentUser() user: DecryptedUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, user.role, dto);
  }

  @Post("parent-child")
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.PARENT)
  linkParentChild(@Body() dto: LinkParentChildDto) {
    return this.usersService.linkParentChild(dto.parentUserId, dto.childUserId);
  }
}
