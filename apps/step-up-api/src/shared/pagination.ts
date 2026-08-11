import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export const DEFAULT_PAGE_LIMIT = 25;
export const MAX_PAGE_LIMIT = 50;

export class PaginationQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_LIMIT)
  limit?: number;
}

export type Page<T> = {
  items: T[];
  nextCursor: string | null;
  limit: number;
};

export function resolvePageLimit(limit?: number): number {
  if (limit == null || Number.isNaN(limit)) {
    return DEFAULT_PAGE_LIMIT;
  }
  return Math.min(Math.max(1, limit), MAX_PAGE_LIMIT);
}

export function buildPage<T>(
  rows: T[],
  limit: number,
  cursorOf: (row: T) => string,
): Page<T> {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  return {
    items,
    nextCursor: hasMore && last ? cursorOf(last) : null,
    limit,
  };
}
