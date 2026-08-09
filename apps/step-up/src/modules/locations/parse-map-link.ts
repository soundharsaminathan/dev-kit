import type { MapCoordinates } from "./types";

const COORD_PAIR = /(-?\d{1,3}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)/;

const SHORT_MAP_HOSTS = new Set(["maps.app.goo.gl", "goo.gl", "g.co"]);

function asCoordinates(
  latitude: number,
  longitude: number,
): MapCoordinates | null {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }
  if (latitude === 0 && longitude === 0) {
    return null;
  }
  return { latitude, longitude };
}

function pairFromMatch(match: RegExpMatchArray | null): MapCoordinates | null {
  if (!match) return null;
  return asCoordinates(Number(match[1]), Number(match[2]));
}

function parseQueryCoords(url: URL): MapCoordinates | null {
  const keys = ["q", "query", "ll", "sll", "center", "destination", "daddr"];
  for (const key of keys) {
    const raw = url.searchParams.get(key);
    if (!raw) continue;
    const decoded = decodeURIComponent(raw.replace(/\+/g, " ")).trim();
    if (!/^-?\d/.test(decoded)) continue;
    const coords = pairFromMatch(decoded.match(COORD_PAIR));
    if (coords) return coords;
  }

  const mlat = url.searchParams.get("mlat");
  const mlon = url.searchParams.get("mlon");
  if (mlat && mlon) {
    return asCoordinates(Number(mlat), Number(mlon));
  }

  return null;
}

function parseHashCoords(hash: string): MapCoordinates | null {
  const mapMatch = hash.match(
    /map=\d+(?:\.\d+)?\/(-?\d+\.?\d*)\/(-?\d+\.?\d*)/,
  );
  if (mapMatch) {
    return asCoordinates(Number(mapMatch[1]), Number(mapMatch[2]));
  }
  return null;
}

function parsePathCoords(
  pathname: string,
  href: string,
): MapCoordinates | null {
  const pinMatch = href.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
  if (pinMatch) {
    return asCoordinates(Number(pinMatch[1]), Number(pinMatch[2]));
  }

  const atMatch = href.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) {
    return asCoordinates(Number(atMatch[1]), Number(atMatch[2]));
  }

  const searchMatch = pathname.match(
    /\/maps\/search\/(-?\d+\.?\d*)(?:,|\+|%2C|\s)+(-?\d+\.?\d*)/i,
  );
  if (searchMatch) {
    return asCoordinates(Number(searchMatch[1]), Number(searchMatch[2]));
  }

  const dirMatch = pathname.match(
    /\/maps\/dir\/(-?\d+\.?\d*)(?:,|\+|%2C|\s)+(-?\d+\.?\d*)/i,
  );
  if (dirMatch) {
    return asCoordinates(Number(dirMatch[1]), Number(dirMatch[2]));
  }

  return null;
}

export function isShortMapLink(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  try {
    const url = new URL(
      trimmed.includes("://") ? trimmed : `https://${trimmed}`,
    );
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (SHORT_MAP_HOSTS.has(host)) return true;
    if (host === "goo.gl" && url.pathname.startsWith("/maps")) return true;
    return false;
  } catch {
    return false;
  }
}

export function parseMapLink(input: string): MapCoordinates | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^geo:/i.test(trimmed)) {
    const geoBody = trimmed.slice(4).split("?")[0] ?? "";
    return pairFromMatch(geoBody.match(COORD_PAIR));
  }

  if (
    !trimmed.includes("://") &&
    !trimmed.includes("/") &&
    COORD_PAIR.test(trimmed)
  ) {
    return pairFromMatch(trimmed.match(COORD_PAIR));
  }

  let url: URL;
  try {
    url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    return pairFromMatch(trimmed.match(COORD_PAIR));
  }

  const fromPath = parsePathCoords(url.pathname, url.href);
  if (fromPath) return fromPath;

  const fromQuery = parseQueryCoords(url);
  if (fromQuery) return fromQuery;

  const fromHash = parseHashCoords(url.hash);
  if (fromHash) return fromHash;

  return null;
}
