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
import { BranchMediaCategory, BranchMediaKind, UserRole } from "@prisma/client";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
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
import type { DecryptedUser } from "../users/user-crypto.service";
import { BranchesService } from "./branches.service";

const READ_ROLES = [
  UserRole.OWNER,
  UserRole.STAFF,
  UserRole.TRAINER,
  UserRole.STUDENT,
  UserRole.PARENT,
] as const;

const WRITE_ROLES = [UserRole.OWNER, UserRole.STAFF] as const;

class CreateBranchDto {
  @IsString()
  studioId!: string;

  @IsString()
  name!: string;

  @IsString()
  address!: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @IsOptional()
  openingHours?: Record<string, unknown> | null;

  @IsOptional()
  @IsString()
  pricingBlurb?: string | null;
}

class UpdateBranchDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @IsOptional()
  openingHours?: Record<string, unknown> | null;

  @IsOptional()
  @IsString()
  pricingBlurb?: string | null;
}

class AddMediaItemDto {
  @IsString()
  objectKey!: string;

  @IsOptional()
  @IsEnum(BranchMediaKind)
  kind?: BranchMediaKind;

  @IsOptional()
  @IsEnum(BranchMediaCategory)
  category?: BranchMediaCategory;

  @IsOptional()
  @IsString()
  caption?: string | null;

  @IsOptional()
  @IsString()
  altText?: string | null;
}

class AddMediaDto {
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => AddMediaItemDto)
  items!: AddMediaItemDto[];
}

class UpdateMediaDto {
  @IsOptional()
  @IsEnum(BranchMediaCategory)
  category?: BranchMediaCategory;

  @IsOptional()
  @IsString()
  caption?: string | null;

  @IsOptional()
  @IsString()
  altText?: string | null;

  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}

class ReorderMediaDto {
  @IsArray()
  @IsString({ each: true })
  orderedIds!: string[];
}

class SetCoverDto {
  @IsString()
  mediaId!: string;
}

class FaqItemDto {
  @IsString()
  question!: string;

  @IsString()
  answer!: string;
}

class ReplaceFaqsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FaqItemDto)
  faqs!: FaqItemDto[];
}

class TestimonialItemDto {
  @IsString()
  quote!: string;

  @IsString()
  authorName!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number | null;
}

class ReplaceTestimonialsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestimonialItemDto)
  testimonials!: TestimonialItemDto[];
}

@Controller()
@UseGuards(AuthGuard, RolesGuard)
export class BranchesController {
  constructor(
    @Inject(BranchesService) private readonly branchesService: BranchesService,
  ) {}

  @Get("studios/:studioId/branches")
  @Roles(...READ_ROLES)
  listByStudio(
    @Param("studioId") studioId: string,
    @CurrentUser() user: DecryptedUser,
  ) {
    return this.branchesService.listByStudio(studioId, user);
  }

  @Get("branches/:id/landing")
  @Roles(...READ_ROLES)
  getLanding(@Param("id") id: string, @CurrentUser() user: DecryptedUser) {
    return this.branchesService.getLanding(id, user);
  }

  @Get("branches/:id")
  @Roles(...READ_ROLES)
  getById(
    @Param("id") id: string,
    @CurrentUser() user: DecryptedUser,
    @Query("includeArchived") includeArchived?: string,
  ) {
    return this.branchesService.getById(
      id,
      user,
      includeArchived === "true" || includeArchived === "1",
    );
  }

  @Post("branches")
  @Roles(...WRITE_ROLES)
  create(@CurrentUser() user: DecryptedUser, @Body() dto: CreateBranchDto) {
    return this.branchesService.create(user, dto);
  }

  @Patch("branches/:id")
  @Roles(...WRITE_ROLES)
  update(
    @Param("id") id: string,
    @CurrentUser() user: DecryptedUser,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.branchesService.update(id, user, dto);
  }

  @Delete("branches/:id")
  @Roles(...WRITE_ROLES)
  remove(@Param("id") id: string, @CurrentUser() user: DecryptedUser) {
    return this.branchesService.remove(id, user);
  }

  @Post("branches/:id/media")
  @Roles(...WRITE_ROLES)
  addMedia(
    @Param("id") id: string,
    @CurrentUser() user: DecryptedUser,
    @Body() dto: AddMediaDto,
  ) {
    return this.branchesService.addMedia(id, user, dto.items);
  }

  @Patch("branches/:id/media/reorder")
  @Roles(...WRITE_ROLES)
  reorderMedia(
    @Param("id") id: string,
    @CurrentUser() user: DecryptedUser,
    @Body() dto: ReorderMediaDto,
  ) {
    return this.branchesService.reorderMedia(id, user, dto.orderedIds);
  }

  @Patch("branches/:id/cover")
  @Roles(...WRITE_ROLES)
  setCover(
    @Param("id") id: string,
    @CurrentUser() user: DecryptedUser,
    @Body() dto: SetCoverDto,
  ) {
    return this.branchesService.setCover(id, user, dto.mediaId);
  }

  @Patch("branches/:id/media/:mediaId")
  @Roles(...WRITE_ROLES)
  updateMedia(
    @Param("id") id: string,
    @Param("mediaId") mediaId: string,
    @CurrentUser() user: DecryptedUser,
    @Body() dto: UpdateMediaDto,
  ) {
    return this.branchesService.updateMedia(id, mediaId, user, dto);
  }

  @Delete("branches/:id/media/:mediaId")
  @Roles(...WRITE_ROLES)
  deleteMedia(
    @Param("id") id: string,
    @Param("mediaId") mediaId: string,
    @CurrentUser() user: DecryptedUser,
  ) {
    return this.branchesService.deleteMedia(id, mediaId, user);
  }

  @Patch("branches/:id/faqs")
  @Roles(...WRITE_ROLES)
  replaceFaqs(
    @Param("id") id: string,
    @CurrentUser() user: DecryptedUser,
    @Body() dto: ReplaceFaqsDto,
  ) {
    return this.branchesService.replaceFaqs(id, user, dto.faqs);
  }

  @Patch("branches/:id/testimonials")
  @Roles(...WRITE_ROLES)
  replaceTestimonials(
    @Param("id") id: string,
    @CurrentUser() user: DecryptedUser,
    @Body() dto: ReplaceTestimonialsDto,
  ) {
    return this.branchesService.replaceTestimonials(id, user, dto.testimonials);
  }
}
