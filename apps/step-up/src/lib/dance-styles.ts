export type DanceStyle = {
  id: string;
  label: string;
  abbrev: string;
  color: string;
  emoji: string;
};

export const DANCE_STYLES: DanceStyle[] = [
  {
    id: "hip-hop",
    label: "Hip Hop",
    abbrev: "HH",
    color: "#E4572E",
    emoji: "🎤",
  },
  {
    id: "contemporary",
    label: "Contemporary",
    abbrev: "CO",
    color: "#6C63FF",
    emoji: "💫",
  },
  {
    id: "freestyle",
    label: "Freestyle",
    abbrev: "FS",
    color: "#FF6B6B",
    emoji: "✨",
  },
  {
    id: "breaking",
    label: "Breaking",
    abbrev: "BR",
    color: "#2D3436",
    emoji: "🤸",
  },
  {
    id: "lyrical",
    label: "Lyrical",
    abbrev: "LY",
    color: "#A29BFE",
    emoji: "🎭",
  },
  { id: "house", label: "House", abbrev: "HO", color: "#00B894", emoji: "🎧" },
  {
    id: "locking",
    label: "Locking",
    abbrev: "LO",
    color: "#E1A100",
    emoji: "🔒",
  },
  {
    id: "bollywood",
    label: "Bollywood",
    abbrev: "BO",
    color: "#E84393",
    emoji: "🎬",
  },
  {
    id: "commercial",
    label: "Commercial",
    abbrev: "CM",
    color: "#0984E3",
    emoji: "💃",
  },
  { id: "jazz", label: "Jazz", abbrev: "JZ", color: "#E17055", emoji: "🎷" },
  {
    id: "popping",
    label: "Popping",
    abbrev: "PO",
    color: "#6C5CE7",
    emoji: "⚡",
  },
  {
    id: "afrobeats",
    label: "Afrobeats",
    abbrev: "AF",
    color: "#00CEC9",
    emoji: "🥁",
  },
  {
    id: "ballet",
    label: "Ballet",
    abbrev: "BA",
    color: "#FD79A8",
    emoji: "🩰",
  },
];

const styleByKey = new Map<string, DanceStyle>();

for (const style of DANCE_STYLES) {
  styleByKey.set(style.id, style);
  styleByKey.set(style.label.toLowerCase(), style);
  styleByKey.set(style.id.replace(/-/g, " "), style);
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

export function resolveDanceStyle(value: string): DanceStyle {
  const normalized = value.trim();
  const known =
    styleByKey.get(normalized.toLowerCase()) ??
    styleByKey.get(normalized.toLowerCase().replace(/\s+/g, "-"));

  if (known) {
    return known;
  }

  return {
    id: normalized.toLowerCase().replace(/\s+/g, "-"),
    label: normalized,
    abbrev: fallbackAbbrev(normalized),
    color: fallbackColor(normalized),
    emoji: "💃",
  };
}

export function danceStyleLabel(value: string) {
  return resolveDanceStyle(value).label;
}

export function trainerHasStyle(trainerStyles: string[], styleLabel: string) {
  const target = resolveDanceStyle(styleLabel);
  return trainerStyles.some((stored) => {
    const resolved = resolveDanceStyle(stored);
    return resolved.id === target.id || resolved.label === target.label;
  });
}

export function collectTrainerStyleFilters(
  trainers: Array<{ styles: string[] }>,
) {
  const labels = new Set<string>();
  for (const trainer of trainers) {
    for (const style of trainer.styles) {
      labels.add(resolveDanceStyle(style).label);
    }
  }

  return DANCE_STYLES.filter((style) => labels.has(style.label)).map(
    (style) => ({
      id: style.label,
      label: style.label,
      style,
    }),
  );
}
