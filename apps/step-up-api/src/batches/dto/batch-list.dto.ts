import { Transform } from "class-transformer";
import { IsBoolean, IsIn, IsOptional, IsString } from "class-validator";
import { PaginationQueryDto } from "../../shared/pagination";
import type { DiscoverBatchFilters } from "../batches.service";

export type { DiscoverBatchFilters };

export class BatchListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  style?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  trainerId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value === "true" || value === "1" || value === true)
  @IsBoolean()
  activeOnly?: boolean;

  @IsOptional()
  @IsString()
  studentId?: string;
}

export class BatchRosterQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(["active", "inactive"])
  tab?: "active" | "inactive";
}

export function toDiscoverFilters(
  query: BatchListQueryDto,
): DiscoverBatchFilters {
  return {
    style: query.style,
    category: query.category,
    trainerId: query.trainerId,
    branchId: query.branchId,
    search: query.search,
    activeOnly: query.activeOnly === true,
    studentId: query.studentId,
  };
}
