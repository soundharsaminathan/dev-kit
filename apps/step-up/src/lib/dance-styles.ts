export type DanceStyle = {
  id: string;
  label: string;
  abbrev: string;
  color: string;
  emoji: string;
};

export const CANONICAL_FREE_STYLE_LABEL = "Free Style";

export const DEFAULT_DANCE_STYLES: DanceStyle[] = [
  {
    id: "hip-hop",
    label: "Hip Hop",
    abbrev: "HH",
    color: "#E4572E",
    emoji: "🎤",
  },
  {
    id: "free-style",
    label: CANONICAL_FREE_STYLE_LABEL,
    abbrev: "FS",
    color: "#6C63FF",
    emoji: "🕺",
  },
  {
    id: "bharatanatyam",
    label: "Bharatanatyam",
    abbrev: "BH",
    color: "#C44569",
    emoji: "🪷",
  },
  {
    id: "ballet",
    label: "Ballet",
    abbrev: "BA",
    color: "#0984E3",
    emoji: "🩰",
  },
  {
    id: "contemporary",
    label: "Contemporary",
    abbrev: "CO",
    color: "#00B894",
    emoji: "💃",
  },
  {
    id: "bollywood",
    label: "Bollywood",
    abbrev: "BO",
    color: "#E17055",
    emoji: "🎬",
  },
  {
    id: "kathak",
    label: "Kathak",
    abbrev: "KA",
    color: "#D63031",
    emoji: "💫",
  },
  {
    id: "jazz",
    label: "Jazz",
    abbrev: "JZ",
    color: "#6C5CE7",
    emoji: "🎷",
  },
  {
    id: "salsa",
    label: "Salsa",
    abbrev: "SA",
    color: "#E84393",
    emoji: "🔥",
  },
  {
    id: "western",
    label: "Western",
    abbrev: "WE",
    color: "#00CEC9",
    emoji: "🤠",
  },
  {
    id: "breaking",
    label: "Breaking",
    abbrev: "BR",
    color: "#2D3436",
    emoji: "🌀",
  },
  {
    id: "choreography",
    label: "Choreography",
    abbrev: "CH",
    color: "#FD79A8",
    emoji: "✨",
  },
  {
    id: "kuthu",
    label: "Kuthu",
    abbrev: "KU",
    color: "#E66700",
    emoji: "🥁",
  },
  {
    id: "semi-classical",
    label: "Semi Classical",
    abbrev: "SC",
    color: "#A29BFE",
    emoji: "🎀",
  },
  {
    id: "folk",
    label: "Folk",
    abbrev: "FO",
    color: "#26DE81",
    emoji: "🌾",
  },
  {
    id: "fusion",
    label: "Fusion",
    abbrev: "FU",
    color: "#778BEB",
    emoji: "🌈",
  },
];

function isFreeStyleName(value: string): boolean {
  const normalized = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return false;
  return /\bfree\b/.test(normalized) || normalized.includes("freestyle");
}

export function canonicalizeFreeStyleName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return isFreeStyleName(trimmed) ? CANONICAL_FREE_STYLE_LABEL : trimmed;
}

export function styleIdentityKey(value: string): string {
  return canonicalizeFreeStyleName(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function buildStyleIndex(catalog: DanceStyle[]) {
  const styleByKey = new Map<string, DanceStyle>();
  function indexStyle(style: DanceStyle, key: string) {
    const normalized = key.trim().toLowerCase();
    if (!normalized || styleByKey.has(normalized)) return;
    styleByKey.set(normalized, style);
  }
  for (const style of catalog) {
    indexStyle(style, style.id);
    indexStyle(style, style.label);
    indexStyle(style, style.id.replace(/-/g, " "));
    indexStyle(style, styleIdentityKey(style.id));
    indexStyle(style, styleIdentityKey(style.label));
    if (isFreeStyleName(style.label) || style.id === "free-style") {
      indexStyle(style, "freestyle");
      indexStyle(style, "free style");
      indexStyle(style, "free-style");
      indexStyle(style, "free");
    }
  }
  return styleByKey;
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function fallbackAbbrev(label: string) {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}`.toUpperCase();
  }
  return label.slice(0, 2).toUpperCase();
}

function fallbackColor(label: string) {
  const palette = [
    "#E4572E",
    "#6C63FF",
    "#00B894",
    "#E84393",
    "#0984E3",
    "#E17055",
    "#6C5CE7",
    "#00CEC9",
  ];
  return palette[hashString(label) % palette.length]!;
}

export function slugifyDanceStyleId(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function resolveDanceStyle(
  value: string,
  catalog?: DanceStyle[] | null,
): DanceStyle {
  const normalized = canonicalizeFreeStyleName(value.trim());
  const lookupCatalog =
    catalog && catalog.length > 0 ? catalog : DEFAULT_DANCE_STYLES;
  if (lookupCatalog.length > 0) {
    const index = buildStyleIndex(lookupCatalog);
    const known =
      index.get(normalized.toLowerCase()) ??
      index.get(normalized.toLowerCase().replace(/\s+/g, "-")) ??
      index.get(styleIdentityKey(normalized));
    if (known) {
      return known;
    }
  }

  if (isFreeStyleName(normalized)) {
    return (
      DEFAULT_DANCE_STYLES.find((style) => style.id === "free-style") ?? {
        id: "free-style",
        label: CANONICAL_FREE_STYLE_LABEL,
        abbrev: "FS",
        color: "#6C63FF",
        emoji: "🕺",
      }
    );
  }

  return {
    id: slugifyDanceStyleId(normalized) || normalized.toLowerCase(),
    label: normalized,
    abbrev: fallbackAbbrev(normalized),
    color: fallbackColor(normalized),
    emoji: "💃",
  };
}

export function danceStyleLabel(value: string, catalog?: DanceStyle[] | null) {
  return resolveDanceStyle(value, catalog).label;
}

export function trainerHasStyle(
  trainerStyles: string[],
  styleLabel: string,
  catalog?: DanceStyle[] | null,
) {
  const target = resolveDanceStyle(styleLabel, catalog);
  return trainerStyles.some((stored) => {
    const resolved = resolveDanceStyle(stored, catalog);
    return resolved.id === target.id || resolved.label === target.label;
  });
}

export function collectTrainerStyleFilters(
  trainers: Array<{ styles: string[] }>,
  catalog?: DanceStyle[] | null,
) {
  const resolvedCatalog = danceStyleOptions(catalog);
  const used = new Map<string, DanceStyle>();
  for (const trainer of trainers) {
    for (const style of trainer.styles) {
      const resolved = resolveDanceStyle(style, resolvedCatalog);
      const key = styleIdentityKey(resolved.label);
      if (!used.has(key)) used.set(key, resolved);
    }
  }

  const fromCatalog = resolvedCatalog
    .filter((style) => used.has(styleIdentityKey(style.label)))
    .map((style) => ({
      id: style.label,
      label: style.label,
      style,
    }));
  const extras = [...used.values()]
    .filter(
      (style) =>
        !resolvedCatalog.some(
          (item) =>
            styleIdentityKey(item.label) === styleIdentityKey(style.label),
        ),
    )
    .map((style) => ({
      id: style.label,
      label: style.label,
      style,
    }));
  return [...fromCatalog, ...extras];
}

export function collectStyleFilterChips(
  values: Array<string | null | undefined>,
) {
  const byKey = new Map<string, string>();
  for (const value of values) {
    if (!value?.trim()) continue;
    const label = resolveDanceStyle(value).label;
    const key = styleIdentityKey(label);
    if (!byKey.has(key)) byKey.set(key, label);
  }
  return [...byKey.values()]
    .sort((left, right) => left.localeCompare(right))
    .map((label) => ({ id: label, label }));
}

export function danceStyleOptions(stored?: DanceStyle[] | null): DanceStyle[] {
  return stored && stored.length > 0 ? stored : DEFAULT_DANCE_STYLES;
}

export function effectiveDanceStyles(
  stored: DanceStyle[] | null | undefined,
): DanceStyle[] {
  return stored ?? [];
}
