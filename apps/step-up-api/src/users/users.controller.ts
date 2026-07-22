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
import { ExperienceLevel, ProfileVisibility, UserRole } from "@prisma/client";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SocialService } from "../social/social.service";
import {
  isStudentFunnelPeriod,
  STUDENT_FUNNEL_PERIODS,
  type StudentFunnelPeriod,
} from "./student-funnel";
import type { DecryptedUser } from "./user-crypto.service";
import { UsersService } from "./users.service";

class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

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
  @IsString()
  preferredBranchId?: string | null;

  @IsOptional()
  @IsEnum(ProfileVisibility)
  profileVisibility?: ProfileVisibility;
}

class LinkParentChildDto {
  @IsString()
  parentUserId!: string;

  @IsString()
  childUserId!: string;
}

class CreateStudentDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  styles?: string[];
}

class CreateTrainerDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  styles?: string[];
}

class BulkStudentDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

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
  completeOnboarding(@CurrentUser() user: DecryptedUser) {
    return this.usersService.completeOnboarding(user.id);
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
  listByStudio(@Param("studioId") studioId: string) {
    return this.usersService.listByStudio(studioId);
  }

  @Get("studio/:studioId/students")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  listStudents(@Param("studioId") studioId: string, @Query("q") q?: string) {
    return this.usersService.listStudents(studioId, q);
  }

  @Get("studio/:studioId/student-funnel")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  getStudentFunnel(
    @Param("studioId") studioId: string,
    @Query("period") period?: string,
  ) {
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

  @Get("studio/:studioId/students/:studentId")
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.TRAINER)
  getStudentStudioProfile(
    @Param("studioId") studioId: string,
    @Param("studentId") studentId: string,
  ) {
    return this.usersService.getStudentStudioProfile(studioId, studentId);
  }

  @Get("studio/:studioId/trainers")
  listStudioTrainers(
    @CurrentUser() user: DecryptedUser,
    @Param("studioId") studioId: string,
  ) {
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
