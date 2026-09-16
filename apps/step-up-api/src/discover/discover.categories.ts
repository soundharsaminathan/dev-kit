/** Activity taxonomy for public discover. Maps danceCategories names → buckets. */

export type DiscoverCategoryId =
  | "dance"
  | "music"
  | "art"
  | "fitness"
  | "swimming"
  | "martial-arts"
  | "theatre"
  | "other";

export type DiscoverCategory = {
  id: DiscoverCategoryId;
  label: string;
};

export const DISCOVER_CATEGORIES: readonly DiscoverCategory[] = [
  { id: "dance", label: "Dance" },
  { id: "music", label: "Music" },
  { id: "art", label: "Art" },
  { id: "fitness", label: "Fitness" },
  { id: "swimming", label: "Swimming" },
  { id: "martial-arts", label: "Martial arts" },
  { id: "theatre", label: "Theatre" },
  { id: "other", label: "Other classes" },
] as const;

const KEYWORD_MAP: Array<{ id: DiscoverCategoryId; patterns: RegExp[] }> = [
  {
    id: "dance",
    patterns: [
      /\bdance\b/i,
      /\bbharatanatyam\b/i,
      /\bkuchipudi\b/i,
      /\bodissi\b/i,
      /\bkathak\b/i,
      /\bmohiniyattam\b/i,
      /\bhip[\s-]?hop\b/i,
      /\bcontemporary\b/i,
      /\bballet\b/i,
      /\bsalsa\b/i,
      /\bbhangra\b/i,
      /\bfolk\b/i,
      /\bwestern\b/i,
      /\bbreak(?:ing|dance)\b/i,
      /\bjazz\b/i,
      /\btap\b/i,
    ],
  },
  {
    id: "music",
    patterns: [
      /\bmusic\b/i,
      /\bsinging\b/i,
      /\bvocal\b/i,
      /\bpiano\b/i,
      /\bguitar\b/i,
      /\bviolin\b/i,
      /\bdrums?\b/i,
      /\bcarnatic\b/i,
      /\bhindustani\b/i,
      /\binstrument\b/i,
    ],
  },
  {
    id: "art",
    patterns: [
      /\bart\b/i,
      /\bpaint(?:ing)?\b/i,
      /\bdraw(?:ing)?\b/i,
      /\bsketch\b/i,
      /\bcraft\b/i,
      /\bpottery\b/i,
    ],
  },
  {
    id: "fitness",
    patterns: [
      /\bfitness\b/i,
      /\byoga\b/i,
      /\bpilates\b/i,
      /\bzumba\b/i,
      /\baerobic/i,
      /\bgym\b/i,
      /\bstrength\b/i,
    ],
  },
  {
    id: "swimming",
    patterns: [/\bswim(?:ming)?\b/i, /\baquatic\b/i],
  },
  {
    id: "martial-arts",
    patterns: [
      /\bmartial\b/i,
      /\bkarate\b/i,
      /\btaekwondo\b/i,
      /\bkung[\s-]?fu\b/i,
      /\bjudo\b/i,
      /\bkalaripayattu\b/i,
      /\bboxing\b/i,
    ],
  },
  {
    id: "theatre",
    patterns: [
      /\btheatre\b/i,
      /\btheater\b/i,
      /\bdrama\b/i,
      /\bacting\b/i,
      /\bimprov\b/i,
    ],
  },
];

export function categorizeStyleName(name: string): DiscoverCategoryId {
  const value = name.trim();
  if (!value) return "other";
  for (const entry of KEYWORD_MAP) {
    if (entry.patterns.some((pattern) => pattern.test(value))) {
      return entry.id;
    }
  }
  return "other";
}

export function stylesFromDanceCategories(danceCategories: unknown): string[] {
  if (!Array.isArray(danceCategories)) return [];
  const names: string[] = [];
  for (const item of danceCategories) {
    if (!item || typeof item !== "object") continue;
    const name = (item as { name?: unknown }).name;
    if (typeof name === "string" && name.trim()) {
      names.push(name.trim());
    }
  }
  return names;
}

export function categoriesFromStyles(styles: string[]): DiscoverCategoryId[] {
  const seen = new Set<DiscoverCategoryId>();
  for (const style of styles) {
    seen.add(categorizeStyleName(style));
  }
  if (seen.size === 0) {
    // Dance studios with no styles still count as dance for empty taxonomy.
    seen.add("dance");
  }
  return [...seen];
}

export function isValidCategoryId(value: string): value is DiscoverCategoryId {
  return DISCOVER_CATEGORIES.some((category) => category.id === value);
}
