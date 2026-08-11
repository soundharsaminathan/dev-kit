export type Page<T> = {
  items: T[];
  nextCursor: string | null;
  limit: number;
};

export function unwrapPage<T>(data: Page<T> | T[] | null | undefined): T[] {
  if (data == null) return [];
  if (Array.isArray(data)) return data;
  return Array.isArray(data.items) ? data.items : [];
}

/** Follow cursor pages until exhausted (admin lists without infinite-scroll UI). */
export async function fetchAllPages<T>(
  load: (cursor?: string) => Promise<Page<T> | T[]>,
  maxPages = 20,
): Promise<T[]> {
  const items: T[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < maxPages; page += 1) {
    const data = await load(cursor);
    if (Array.isArray(data)) {
      return data;
    }
    items.push(...(data.items ?? []));
    if (!data.nextCursor) {
      break;
    }
    cursor = data.nextCursor;
  }
  return items;
}
