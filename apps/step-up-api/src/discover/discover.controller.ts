import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { OptionalAuthGuard } from "../auth/optional-auth.guard";
import type { DecryptedUser } from "../users/user-crypto.service";
import { MarketplaceRatingsService } from "./marketplace-ratings.service";
import { isValidCategoryId } from "./discover.categories";
import {
  DiscoverService,
  type DiscoverStudioFilters,
} from "./discover.service";
import { CLASS_LEVELS, MARKETPLACE_SORTS } from "./marketplace.contract";
import { MarketplaceCatalogService } from "./marketplace-catalog.service";
import {
  parseClassLevel,
  parseMarketplaceCategory,
  usesMarketplaceCatalogQuery,
} from "./marketplace-catalog.query";
import type {
  MarketplaceCatalogFilters,
  MarketplaceCatalogViewer,
} from "./marketplace-catalog.types";

class DiscoverStudiosQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  style?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  locality?: string;

  @IsOptional()
  @IsIn(["KIDS", "ADULTS"])
  audience?: "KIDS" | "ADULTS";

  @IsOptional()
  @IsIn([...CLASS_LEVELS])
  level?: (typeof CLASS_LEVELS)[number];

  @IsOptional()
  @IsIn(["weekday", "weekend"])
  days?: "weekday" | "weekend";

  @IsOptional()
  @IsIn(["morning", "evening"])
  time?: "morning" | "evening";

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(200)
  maxKm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100000)
  maxPrice?: number;

  @IsOptional()
  @IsIn([...MARKETPLACE_SORTS])
  sort?: (typeof MARKETPLACE_SORTS)[number];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(48)
  limit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  studentId?: string;
}

function toLegacyFilters(query: DiscoverStudiosQueryDto): DiscoverStudioFilters {
  const filters: DiscoverStudioFilters = {};
  if (query.q?.trim()) filters.q = query.q.trim();
  if (query.city?.trim()) {
    filters.city = query.city.trim().toLowerCase();
  }
  if (query.category?.trim() && isValidCategoryId(query.category.trim())) {
    filters.category = query.category.trim();
  }
  if (query.style?.trim()) filters.style = query.style.trim();
  if (query.locality?.trim()) {
    filters.locality = query.locality.trim().toLowerCase();
  }
  if (query.audience) filters.audience = query.audience;
  if (query.days) filters.days = query.days;
  if (query.time) filters.time = query.time;
  if (query.lat != null && query.lng != null) {
    filters.lat = query.lat;
    filters.lng = query.lng;
  }
  if (query.maxKm != null) filters.maxKm = query.maxKm;
  if (query.maxPrice != null) filters.maxPrice = query.maxPrice;
  if (query.limit != null) filters.limit = query.limit;
  return filters;
}

function catalogViewer(
  user?: DecryptedUser,
  studentId?: string,
): MarketplaceCatalogViewer | undefined {
  if (!user) return undefined;
  return {
    actorId: user.id,
    role: user.role,
    requestedStudentId: studentId,
  };
}

function toCatalogFilters(
  query: DiscoverStudiosQueryDto,
): MarketplaceCatalogFilters {
  const filters: MarketplaceCatalogFilters = {
    category: parseMarketplaceCategory(query.category),
    city: query.city ?? "chennai",
  };
  if (query.q?.trim()) filters.q = query.q.trim();
  if (query.style?.trim()) filters.style = query.style.trim();
  if (query.locality?.trim()) {
    filters.locality = query.locality.trim().toLowerCase();
  }
  if (query.audience) filters.audience = query.audience;
  const level = parseClassLevel(query.level);
  if (level) filters.level = level;
  if (query.days) filters.days = query.days;
  if (query.time) filters.time = query.time;
  if (query.lat != null && query.lng != null) {
    filters.lat = query.lat;
    filters.lng = query.lng;
  }
  if (query.maxKm != null) filters.maxKm = query.maxKm;
  if (query.maxPrice != null) filters.maxPrice = query.maxPrice;
  if (query.sort) filters.sort = query.sort;
  if (query.limit != null) filters.limit = query.limit;
  return filters;
}

class CreateMarketplaceRatingDto {
  @IsString()
  studentId!: string;

  @IsIn(["STUDIO", "TRAINER"])
  target!: "STUDIO" | "TRAINER";

  @IsOptional()
  @IsString()
  studioId?: string;

  @IsOptional()
  @IsString()
  trainerId?: string;

  @IsIn(["DANCE", "MUSIC", "FITNESS", "ART"])
  category!: "DANCE" | "MUSIC" | "FITNESS" | "ART";

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;
}

@Controller("discover")
export class DiscoverController {
  constructor(
    @Inject(DiscoverService) private readonly discover: DiscoverService,
    @Inject(MarketplaceCatalogService)
    private readonly catalog: MarketplaceCatalogService,
    @Inject(MarketplaceRatingsService)
    private readonly ratings: MarketplaceRatingsService,
  ) {}

  @Get("ratings/pending")
  @UseGuards(AuthGuard)
  listPendingRatings(@CurrentUser() user: DecryptedUser) {
    return this.ratings.listPending(user);
  }

  @Post("ratings")
  @UseGuards(AuthGuard)
  createRating(
    @CurrentUser() user: DecryptedUser,
    @Body() body: CreateMarketplaceRatingDto,
  ) {
    return this.ratings.create(user, body);
  }

  @Get("classes")
  @UseGuards(OptionalAuthGuard)
  listClasses(
    @Query() query: DiscoverStudiosQueryDto,
    @CurrentUser() user?: DecryptedUser,
  ) {
    return this.catalog.listClasses(
      toCatalogFilters(query),
      catalogViewer(user, query.studentId),
    );
  }

  @Get("trainers")
  @UseGuards(OptionalAuthGuard)
  listTrainers(@Query() query: DiscoverStudiosQueryDto) {
    return this.catalog.listTrainers(toCatalogFilters(query));
  }

  @Get("classes/:idOrSlug")
  @UseGuards(OptionalAuthGuard)
  getClass(
    @Param("idOrSlug") idOrSlug: string,
    @Query("studentId") studentId?: string,
    @CurrentUser() user?: DecryptedUser,
  ) {
    return this.catalog.getClass(idOrSlug, catalogViewer(user, studentId));
  }

  @Get("trainers/:idOrSlug")
  getTrainer(@Param("idOrSlug") idOrSlug: string) {
    return this.catalog.getTrainer(idOrSlug);
  }

  @Get("studios")
  @UseGuards(OptionalAuthGuard)
  listStudios(@Query() query: DiscoverStudiosQueryDto) {
    if (usesMarketplaceCatalogQuery(query)) {
      return this.catalog.listStudios(toCatalogFilters(query));
    }
    return this.discover.listStudios(toLegacyFilters(query));
  }

  @Get("landing")
  listLanding(@Query("city") city?: string) {
    return this.discover.listLanding(city);
  }

  @Get("studios/:id/trial-slots")
  listTrialSlots(@Param("id") id: string) {
    return this.discover.listPublicTrialSlots(id);
  }

  @Get("studios/:idOrSlug/page")
  @UseGuards(OptionalAuthGuard)
  getMarketplaceStudio(
    @Param("idOrSlug") idOrSlug: string,
    @Query("studentId") studentId?: string,
    @CurrentUser() user?: DecryptedUser,
  ) {
    return this.catalog.getStudio(idOrSlug, catalogViewer(user, studentId));
  }

  @Get("studios/:id")
  getStudio(@Param("id") id: string) {
    return this.discover.getStudio(id);
  }

  @Get("cities")
  listCities() {
    return this.discover.listCities();
  }

  @Get("categories")
  listCategories() {
    return this.discover.listCategories();
  }

  @Get("stats")
  getStats() {
    return this.discover.getStats();
  }
}
