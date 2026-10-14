/** Resolves free-text style names against the activity catalog. */

import {
  canonicalizeFreeStyleName,
  styleIdentityKey,
} from "../common/dance-style-name";
import {
  DISCOVER_ACTIVITIES,
  DISCOVER_CATEGORIES,
  type DiscoverActivity,
  type DiscoverCategoryId,
} from "./discover.taxonomy";

export {
  DISCOVER_ACTIVITIES,
  DISCOVER_CATEGORIES,
  type DiscoverActivity,
  type DiscoverCategory,
  type DiscoverCategoryId,
} from "./discover.taxonomy";

export type StyleClassification = {
  activityId: string | null;
  categoryId: DiscoverCategoryId;
};

export type DanceCategoryEntry = {
  name: string;
  activityId?: string;
  categoryId?: DiscoverCategoryId;
};

type CompiledTerm = {
  alias: string;
  tokenCount: number;
  activityId: string;
  categoryId: Exclude<DiscoverCategoryId, "other">;
};

const QUALIFIERS = new Set([
  "beginner",
  "beginners",
  "intro",
  "introduction",
  "intermediate",
  "advanced",
  "kids",
  "kid",
  "children",
  "child",
  "junior",
  "senior",
  "adult",
  "adults",
  "basic",
  "basics",
  "foundation",
  "foundations",
  "level",
  "grade",
  "workshop",
  "class",
  "classes",
  "club",
  "course",
  "courses",
  "indian",
  "traditional",
  "modern",
  "hatha",
  "ashtanga",
  "vinyasa",
  "iyengar",
  "open",
  "private",
  "group",
  "batch",
]);

const activityById = new Map<string, DiscoverActivity>();
const exactTerms = new Map<string, CompiledTerm>();
const phraseTerms: CompiledTerm[] = [];
const qualifiedTerms: CompiledTerm[] = [];

function normalizeStyleName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsStyleToken(normalized: string, alias: string): boolean {
  return (
    normalized === alias ||
    normalized.startsWith(`${alias} `) ||
    normalized.endsWith(` ${alias}`) ||
    normalized.includes(` ${alias} `)
  );
}

function leftoverTokens(normalized: string, alias: string): string[] {
  const tokens = normalized.split(" ");
  for (const token of alias.split(" ")) {
    const index = tokens.indexOf(token);
    if (index === -1) return tokens;
    tokens.splice(index, 1);
  }
  return tokens;
}

function byLongestAlias(left: CompiledTerm, right: CompiledTerm) {
  return (
    right.tokenCount - left.tokenCount || right.alias.length - left.alias.length
  );
}

function registerTerm(activity: DiscoverActivity, rawAlias: string) {
  const alias = normalizeStyleName(rawAlias);
  if (!alias || exactTerms.has(alias)) return;

  const term: CompiledTerm = {
    alias,
    tokenCount: alias.split(" ").length,
    activityId: activity.id,
    categoryId: activity.categoryId,
  };
  exactTerms.set(alias, term);
  if (activity.match === "qualified") {
    qualifiedTerms.push(term);
    return;
  }
  phraseTerms.push(term);
}

for (const activity of DISCOVER_ACTIVITIES) {
  activityById.set(activity.id, activity);
  registerTerm(activity, activity.label);
  for (const alias of activity.aliases) {
    registerTerm(activity, alias);
  }
}

phraseTerms.sort(byLongestAlias);
qualifiedTerms.sort(byLongestAlias);

function classificationFromTerm(term: CompiledTerm): StyleClassification {
  return { activityId: term.activityId, categoryId: term.categoryId };
}

export function classifyStyleName(name: string): StyleClassification {
  const normalized = normalizeStyleName(name);
  if (!normalized) {
    return { activityId: null, categoryId: "other" };
  }

  const exact = exactTerms.get(normalized);
  if (exact) return classificationFromTerm(exact);

  for (const term of phraseTerms) {
    if (containsStyleToken(normalized, term.alias)) {
      return classificationFromTerm(term);
    }
  }

  for (const term of qualifiedTerms) {
    if (!containsStyleToken(normalized, term.alias)) continue;
    if (
      leftoverTokens(normalized, term.alias).every((token) =>
        QUALIFIERS.has(token),
      )
    ) {
      return classificationFromTerm(term);
    }
  }

  return { activityId: null, categoryId: "other" };
}

export function categorizeStyleName(name: string): DiscoverCategoryId {
  return classifyStyleName(name).categoryId;
}

export function isValidCategoryId(value: string): value is DiscoverCategoryId {
  return DISCOVER_CATEGORIES.some((category) => category.id === value);
}

export function resolveStyleEntry(
  entry: DanceCategoryEntry,
): StyleClassification {
  if (entry.activityId) {
    const activity = activityById.get(entry.activityId);
    if (activity) {
      return { activityId: activity.id, categoryId: activity.categoryId };
    }
  }
  if (entry.categoryId && isValidCategoryId(entry.categoryId)) {
    return {
      activityId: entry.activityId ?? null,
      categoryId: entry.categoryId,
    };
  }
  return classifyStyleName(entry.name);
}

export function danceCategoryEntries(
  danceCategories: unknown,
): DanceCategoryEntry[] {
  if (!Array.isArray(danceCategories)) return [];
  const entries: DanceCategoryEntry[] = [];
  for (const item of danceCategories) {
    if (!item || typeof item !== "object") continue;
    const record = item as {
      name?: unknown;
      activityId?: unknown;
      categoryId?: unknown;
    };
    const name = typeof record.name === "string" ? record.name.trim() : "";
    if (!name) continue;
    const entry: DanceCategoryEntry = { name };
    if (typeof record.activityId === "string" && record.activityId.trim()) {
      entry.activityId = record.activityId.trim();
    }
    if (
      typeof record.categoryId === "string" &&
      isValidCategoryId(record.categoryId)
    ) {
      entry.categoryId = record.categoryId;
    }
    entries.push(entry);
  }
  return entries;
}

export function stylesFromDanceCategories(danceCategories: unknown): string[] {
  return danceCategoryEntries(danceCategories).map((entry) => entry.name);
}

export function canonicalStyleLabel(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  const freeStyle = canonicalizeFreeStyleName(trimmed);
  if (freeStyle !== trimmed) return freeStyle;
  const classified = classifyStyleName(trimmed);
  if (classified.activityId) {
    const activity = activityById.get(classified.activityId);
    if (activity) return activity.label;
  }
  return trimmed;
}

export function uniqueCanonicalStyleNames(names: string[]): string[] {
  const seen = new Set<string>();
  const styles: string[] = [];
  for (const name of names) {
    const label = canonicalStyleLabel(name);
    if (!label) continue;
    const key = styleIdentityKey(label);
    if (seen.has(key)) continue;
    seen.add(key);
    styles.push(label);
  }
  return styles;
}

export function primaryStyleName(danceCategories: unknown): string | null {
  const names = stylesFromDanceCategories(danceCategories);
  const first = names[0];
  return first ? canonicalizeFreeStyleName(first) : null;
}

export function categoriesFromEntries(
  entries: DanceCategoryEntry[],
): DiscoverCategoryId[] {
  const seen = new Set<DiscoverCategoryId>();
  for (const entry of entries) {
    seen.add(resolveStyleEntry(entry).categoryId);
  }
  if (seen.size === 0 || (seen.size === 1 && seen.has("other"))) {
    // Dance-first catalog: empty or unrecognized imported styles still list.
    seen.add("dance");
  }
  return [...seen];
}

export function categoriesFromStyles(styles: string[]): DiscoverCategoryId[] {
  return categoriesFromEntries(styles.map((name) => ({ name })));
}

export function categoriesFromDanceCategories(
  danceCategories: unknown,
): DiscoverCategoryId[] {
  return categoriesFromEntries(danceCategoryEntries(danceCategories));
}
