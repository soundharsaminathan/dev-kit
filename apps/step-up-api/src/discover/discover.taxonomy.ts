/** Canonical discover activity catalog. Classification resolves names against this. */

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

export type ActivityMatch = "phrase" | "qualified";

export type DiscoverActivity = {
  id: string;
  categoryId: Exclude<DiscoverCategoryId, "other">;
  label: string;
  aliases: string[];
  /**
   * phrase: whole-token containment (default).
   * qualified: full name, or containment whose leftover tokens are modifiers.
   */
  match?: ActivityMatch;
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

type ActivityDraft = {
  id: string;
  label: string;
  aliases?: string[];
  match?: ActivityMatch;
};

function activities(
  categoryId: Exclude<DiscoverCategoryId, "other">,
  items: ActivityDraft[],
): DiscoverActivity[] {
  return items.map((item) => ({
    id: item.id,
    categoryId,
    label: item.label,
    aliases: item.aliases ?? [],
    match: item.match,
  }));
}

export const DISCOVER_ACTIVITIES: readonly DiscoverActivity[] = [
  ...activities("dance", [
    { id: "dance", label: "Dance", aliases: ["dancing"] },
    {
      id: "bharatanatyam",
      label: "Bharatanatyam",
      aliases: ["bharatha natyam", "bharata natyam"],
    },
    { id: "kuchipudi", label: "Kuchipudi" },
    { id: "odissi", label: "Odissi" },
    { id: "kathak", label: "Kathak" },
    {
      id: "mohiniyattam",
      label: "Mohiniyattam",
      aliases: ["mohini attam", "mohiniattam"],
    },
    { id: "hip-hop", label: "Hip Hop", aliases: ["hiphop"] },
    { id: "ballet", label: "Ballet" },
    { id: "salsa", label: "Salsa" },
    { id: "bhangra", label: "Bhangra" },
    {
      id: "breaking",
      label: "Breaking",
      aliases: ["breakdance", "break dance", "breakdancing"],
    },
    { id: "tap", label: "Tap" },
    {
      id: "freestyle",
      label: "Free Style",
      aliases: ["freestyle"],
    },
    {
      id: "choreography",
      label: "Choreography",
      aliases: ["choreo"],
    },
    { id: "bachata", label: "Bachata" },
    { id: "bollywood", label: "Bollywood" },
    { id: "kuthu", label: "Kuthu" },
    { id: "semi-classical", label: "Semi Classical" },
    { id: "indian-folk", label: "Indian Folk" },
    { id: "jazz-funk", label: "Jazz Funk" },
    { id: "street-jazz", label: "Street Jazz" },
    { id: "jazz", label: "Jazz", match: "qualified" },
    { id: "folk", label: "Folk", match: "qualified" },
    { id: "western", label: "Western", match: "qualified" },
    { id: "contemporary", label: "Contemporary", match: "qualified" },
    { id: "street", label: "Street", match: "qualified" },
    { id: "latin", label: "Latin", match: "qualified" },
    { id: "commercial", label: "Commercial", match: "qualified" },
    { id: "lyrical", label: "Lyrical", match: "qualified" },
    { id: "fusion", label: "Fusion", match: "qualified" },
  ]),
  ...activities("music", [
    { id: "music", label: "Music", aliases: ["musical"] },
    { id: "singing", label: "Singing" },
    { id: "vocals", label: "Vocals", aliases: ["vocal"] },
    { id: "piano", label: "Piano" },
    { id: "guitar", label: "Guitar" },
    { id: "violin", label: "Violin" },
    { id: "drums", label: "Drums", aliases: ["drum"] },
    { id: "carnatic", label: "Carnatic" },
    { id: "hindustani", label: "Hindustani" },
    { id: "western-classical", label: "Western Classical" },
    {
      id: "instrument",
      label: "Instrument",
      aliases: ["instruments", "instrumental"],
      match: "qualified",
    },
  ]),
  ...activities("art", [
    { id: "art", label: "Art", aliases: ["fine arts"] },
    { id: "arts", label: "Arts", match: "qualified" },
    { id: "painting", label: "Painting", aliases: ["paint"] },
    { id: "drawing", label: "Drawing", aliases: ["draw"] },
    { id: "sketch", label: "Sketch", aliases: ["sketching"] },
    { id: "craft", label: "Craft", aliases: ["crafts"] },
    { id: "pottery", label: "Pottery" },
    {
      id: "watercolor",
      label: "Watercolor",
      aliases: ["water color", "watercolour"],
    },
  ]),
  ...activities("fitness", [
    { id: "fitness", label: "Fitness" },
    { id: "yoga", label: "Yoga" },
    { id: "pilates", label: "Pilates" },
    { id: "zumba", label: "Zumba" },
    { id: "aerobics", label: "Aerobics", aliases: ["aerobic"] },
    { id: "gym", label: "Gym" },
    { id: "strength", label: "Strength" },
  ]),
  ...activities("swimming", [
    { id: "swimming", label: "Swimming", aliases: ["swim"] },
    { id: "aquatic", label: "Aquatic", aliases: ["aquatics"] },
  ]),
  ...activities("martial-arts", [
    {
      id: "martial-arts",
      label: "Martial Arts",
      aliases: ["martial art", "martial"],
    },
    { id: "karate", label: "Karate" },
    {
      id: "taekwondo",
      label: "Taekwondo",
      aliases: ["tae kwon do"],
    },
    { id: "kung-fu", label: "Kung Fu", aliases: ["kungfu"] },
    { id: "judo", label: "Judo" },
    {
      id: "kalaripayattu",
      label: "Kalaripayattu",
      aliases: ["kalari"],
    },
    { id: "boxing", label: "Boxing" },
  ]),
  ...activities("theatre", [
    { id: "theatre", label: "Theatre", aliases: ["theater"] },
    { id: "drama", label: "Drama" },
    { id: "acting", label: "Acting" },
    { id: "improv", label: "Improv", aliases: ["improvisation"] },
  ]),
];
