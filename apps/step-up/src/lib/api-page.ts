export type Page<T> = {
  items: T[];
  nextCursor: string | null;
  limit: number;
};

export function unwrapPage<T>(data: Page<T> | T[]): T[] {
  return Array.isArray(data) ? data : data.items;
}
