/** Fixed India launch cities for address matching. No DB city column yet. */

export type DiscoverCity = {
  id: string;
  label: string;
  aliases: string[];
};

export const DISCOVER_CITIES: readonly DiscoverCity[] = [
  {
    id: "chennai",
    label: "Chennai",
    aliases: ["chennai", "madras"],
  },
  {
    id: "bengaluru",
    label: "Bengaluru",
    aliases: ["bengaluru", "bangalore", "blr"],
  },
  {
    id: "hyderabad",
    label: "Hyderabad",
    aliases: ["hyderabad", "hyd", "secunderabad"],
  },
  {
    id: "mumbai",
    label: "Mumbai",
    aliases: ["mumbai", "bombay"],
  },
  {
    id: "delhi",
    label: "Delhi",
    aliases: ["new delhi", "delhi", "gurugram", "gurgaon", "noida"],
  },
  {
    id: "coimbatore",
    label: "Coimbatore",
    aliases: ["coimbatore", "kovai"],
  },
] as const;

function normalizeAddress(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Match a free-text address against the fixed city list. Unmatched → null. */
export function matchCityFromAddress(
  ...addresses: Array<string | null | undefined>
): DiscoverCity | null {
  for (const raw of addresses) {
    if (!raw?.trim()) continue;
    const normalized = normalizeAddress(raw);
    if (!normalized) continue;

    for (const city of DISCOVER_CITIES) {
      for (const alias of city.aliases) {
        const needle = alias.toLowerCase();
        // Word-boundary-ish: alias as whole token or consecutive words
        if (
          normalized === needle ||
          normalized.startsWith(`${needle} `) ||
          normalized.endsWith(` ${needle}`) ||
          normalized.includes(` ${needle} `)
        ) {
          return city;
        }
      }
    }
  }
  return null;
}

export function findCityById(id: string): DiscoverCity | null {
  const key = id.trim().toLowerCase();
  return DISCOVER_CITIES.find((city) => city.id === key) ?? null;
}
