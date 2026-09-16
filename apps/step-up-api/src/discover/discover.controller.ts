import { Controller, Get, Inject, Param, Query } from "@nestjs/common";
import { Type } from "class-transformer";
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { isValidCategoryId } from "./discover.categories";
import {
  DiscoverService,
  type DiscoverStudioFilters,
} from "./discover.service";

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
  @IsIn(["KIDS", "ADULTS"])
  audience?: "KIDS" | "ADULTS";

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
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(48)
  limit?: number;
}

function toFilters(query: DiscoverStudiosQueryDto): DiscoverStudioFilters {
  const filters: DiscoverStudioFilters = {};
  if (query.q?.trim()) filters.q = query.q.trim();
  if (query.city?.trim()) {
    filters.city = query.city.trim().toLowerCase();
  }
  if (query.category?.trim() && isValidCategoryId(query.category.trim())) {
    filters.category = query.category.trim();
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

@Controller("discover")
export class DiscoverController {
  constructor(
    @Inject(DiscoverService) private readonly discover: DiscoverService,
  ) {}

  @Get("studios")
  listStudios(@Query() query: DiscoverStudiosQueryDto) {
    return this.discover.listStudios(toFilters(query));
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
