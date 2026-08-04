export type DanceStyle = {
  id: string;
  label: string;
  abbrev: string;
  color: string;
  emoji: string;
};

function buildStyleIndex(catalog: DanceStyle[]) {
  const styleByKey = new Map<string, DanceStyle>();
  for (const style of catalog) {
    styleByKey.set(style.id, style);
    styleByKey.set(style.label.toLowerCase(), style);
    styleByKey.set(style.id.replace(/-/g, " "), style);
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
  const normalized = value.trim();
  if (catalog && catalog.length > 0) {
    const index = buildStyleIndex(catalog);
    const known =
      index.get(normalized.toLowerCase()) ??
      index.get(normalized.toLowerCase().replace(/\s+/g, "-"));
    if (known) {
      return known;
    }
  }

  return {
    id: normalized.toLowerCase().replace(/\s+/g, "-"),
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
  if (catalog && catalog.length > 0) {
    const labels = new Set<string>();
    for (const trainer of trainers) {
      for (const style of trainer.styles) {
        labels.add(resolveDanceStyle(style, catalog).label);
      }
    }

    return catalog
      .filter((style) => labels.has(style.label))
      .map((style) => ({
        id: style.label,
        label: style.label,
        style,
      }));
  }

  const byLabel = new Map<string, DanceStyle>();
  for (const trainer of trainers) {
    for (const style of trainer.styles) {
      const resolved = resolveDanceStyle(style);
      if (!byLabel.has(resolved.label)) {
        byLabel.set(resolved.label, resolved);
      }
    }
  }

  return [...byLabel.values()].map((style) => ({
    id: style.label,
    label: style.label,
    style,
  }));
}

export function effectiveDanceStyles(
  stored: DanceStyle[] | null | undefined,
): DanceStyle[] {
  return stored ?? [];
}
