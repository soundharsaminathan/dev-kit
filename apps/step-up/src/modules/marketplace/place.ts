import { DEFAULT_DANCE_STYLES } from "@/lib/dance-styles";
import { MARKETPLACE_AREAS } from "./areas";

export const MARKETPLACE_RESERVED_PATHS = [
  "classes",
  "studios",
  "trainers",
  "me",
  "app",
  "admin",
  "login",
  "register",
  "discover",
  "for-studios",
  "join",
  "privacy",
  "terms",
  "users",
  "posts",
  "studio",
  "auth",
  "forgot-password",
  "help",
] as const;

export const MARKETPLACE_CITY_PLACES = [
  { id: "chennai", label: "Chennai" },
  { id: "bengaluru", label: "Bengaluru" },
  { id: "hyderabad", label: "Hyderabad" },
  { id: "mumbai", label: "Mumbai" },
  { id: "delhi", label: "Delhi" },
  { id: "coimbatore", label: "Coimbatore" },
] as const;

export const MARKETPLACE_STYLE_PLACES = DEFAULT_DANCE_STYLES.map((style) => ({
  id: style.id,
  label: style.label,
}));

export type MarketplacePlace =
  | { kind: "style"; id: string; label: string }
  | { kind: "locality"; id: string; label: string };

export function isMarketplaceReservedPath(value: string): boolean {
  return (MARKETPLACE_RESERVED_PATHS as readonly string[]).includes(
    value.trim().toLowerCase(),
  );
}

export function parseMarketplaceCity(
  value: string | undefined,
): { id: string; label: string } | null {
  if (!value) return null;
  const id = value.trim().toLowerCase();
  if (isMarketplaceReservedPath(id)) return null;
  return MARKETPLACE_CITY_PLACES.find((city) => city.id === id) ?? null;
}

export function parseMarketplacePlace(value: string | undefined): MarketplacePlace | null {
  if (!value) return null;
  const id = value.trim().toLowerCase();
  const style = MARKETPLACE_STYLE_PLACES.find((item) => item.id === id);
  if (style) return { kind: "style", id: style.id, label: style.label };
  const locality = MARKETPLACE_AREAS.find((item) => item.id === id);
  if (locality) return { kind: "locality", id: locality.id, label: locality.label };
  return null;
}

export function marketplaceSeoPath(input: {
  city?: string;
  style?: string;
  locality?: string;
}): string | null {
  const city = parseMarketplaceCity(input.city);
  if (!city) return null;
  if (input.style && input.locality) return null;
  if (input.style && parseMarketplacePlace(input.style)?.kind === "style") {
    return `/${city.id}/${input.style}`;
  }
  if (input.locality && parseMarketplacePlace(input.locality)?.kind === "locality") {
    return `/${city.id}/${input.locality}`;
  }
  return null;
}

export function marketplacePlaceTitle(input: {
  categoryLabel: string;
  cityLabel: string;
  tab: "classes" | "studios" | "trainers";
  place?: MarketplacePlace | null;
}): string {
  const noun =
    input.tab === "classes"
      ? "classes"
      : input.tab === "studios"
        ? "studios"
        : "trainers";
  if (input.place?.kind === "style") {
    return `${input.place.label} ${noun} in ${input.cityLabel}`;
  }
  if (input.place?.kind === "locality") {
    return `${input.categoryLabel} ${noun} in ${input.place.label}`;
  }
  return `${input.categoryLabel} ${noun} in ${input.cityLabel}`;
}

export function clusterMarketplacePins(
  pins: Array<{ id: string; lat: number; lng: number }>,
  zoom: number,
): Array<{
  id: string;
  lat: number;
  lng: number;
  count: number;
  pinIds: string[];
}> {
  if (zoom >= 13) {
    return pins.map((pin) => ({
      id: pin.id,
      lat: pin.lat,
      lng: pin.lng,
      count: 1,
      pinIds: [pin.id],
    }));
  }
  const cell = zoom >= 11 ? 0.04 : 0.12;
  const groups = new Map<
    string,
    { lat: number; lng: number; pinIds: string[] }
  >();
  for (const pin of pins) {
    const key = `${Math.round(pin.lat / cell)}:${Math.round(pin.lng / cell)}`;
    const group = groups.get(key);
    if (group) {
      group.pinIds.push(pin.id);
      group.lat += pin.lat;
      group.lng += pin.lng;
      continue;
    }
    groups.set(key, { lat: pin.lat, lng: pin.lng, pinIds: [pin.id] });
  }
  return [...groups.entries()].map(([key, group]) => ({
    id: group.pinIds.length === 1 ? (group.pinIds[0] ?? key) : `cluster:${key}`,
    lat: group.lat / group.pinIds.length,
    lng: group.lng / group.pinIds.length,
    count: group.pinIds.length,
    pinIds: group.pinIds,
  }));
}

export function marketplacePinsForItems<T extends { itemIds: string[] }>(
  pins: T[] | undefined,
  itemIds: string[],
): T[] {
  const visible = new Set(itemIds);
  return (pins ?? [])
    .map((pin) => ({
      ...pin,
      itemIds: pin.itemIds.filter((id) => visible.has(id)),
    }))
    .filter((pin) => pin.itemIds.length > 0);
}

export function marketplacePlaceDescription(input: {
  title: string;
  count: number;
}): string {
  if (input.count <= 0) {
    return `${input.title} are coming soon on classa.`;
  }
  return `Browse ${input.count} live listing${input.count === 1 ? "" : "s"} for ${input.title} on classa.`;
}
