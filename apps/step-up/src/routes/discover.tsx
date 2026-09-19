import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicShell } from "@/modules/layout/public-shell";
import shared from "@/modules/marketing/marketing.module.scss";
import {
  danceDiscoverQuery,
  fetchDiscoverStudios,
} from "@/modules/student-landing/api";
import {
  StudioCard,
  StudioCardSkeleton,
} from "@/modules/student-landing/studio-card";
import type { DiscoverStudiosQuery } from "@/modules/student-landing/types";
import styles from "./discover.module.scss";

export type DiscoverSearch = {
  q?: string;
  city?: string;
  category?: string;
  style?: string;
  locality?: string;
  audience?: "KIDS" | "ADULTS";
  days?: "weekday" | "weekend";
  time?: "morning" | "evening";
  lat?: number;
  lng?: number;
  maxKm?: number;
  maxPrice?: number;
};

function parseOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function prettySearchBit(value: string) {
  return value
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parseOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

export const Route = createFileRoute("/discover")({
  validateSearch: (search: Record<string, unknown>): DiscoverSearch => {
    const result: DiscoverSearch = {};
    const q = parseOptionalString(search.q);
    const city = parseOptionalString(search.city);
    const category = parseOptionalString(search.category);
    const style = parseOptionalString(search.style);
    const locality = parseOptionalString(search.locality);
    const audience = search.audience;
    const days = search.days;
    const time = search.time;
    const lat = parseOptionalNumber(search.lat);
    const lng = parseOptionalNumber(search.lng);
    const maxKm = parseOptionalNumber(search.maxKm);
    const maxPrice = parseOptionalNumber(search.maxPrice);
    if (q) result.q = q;
    if (city) result.city = city;
    if (category) result.category = category;
    if (style) result.style = style;
    if (locality) result.locality = locality;
    if (audience === "KIDS" || audience === "ADULTS") {
      result.audience = audience;
    }
    if (days === "weekday" || days === "weekend") result.days = days;
    if (time === "morning" || time === "evening") result.time = time;
    if (lat != null) result.lat = lat;
    if (lng != null) result.lng = lng;
    if (maxKm != null) result.maxKm = maxKm;
    if (maxPrice != null) result.maxPrice = maxPrice;
    return result;
  },
  component: DiscoverPage,
});

function DiscoverPage() {
  const search = Route.useSearch();
  const filters: DiscoverStudiosQuery = danceDiscoverQuery({
    limit: 24,
    ...(search.q ? { q: search.q } : {}),
    ...(search.city ? { city: search.city } : {}),
    ...(search.style ? { style: search.style } : {}),
    ...(search.locality ? { locality: search.locality } : {}),
    ...(search.audience ? { audience: search.audience } : {}),
    ...(search.days ? { days: search.days } : {}),
    ...(search.time ? { time: search.time } : {}),
    ...(search.lat != null ? { lat: search.lat } : {}),
    ...(search.lng != null ? { lng: search.lng } : {}),
    ...(search.maxKm != null ? { maxKm: search.maxKm } : {}),
    ...(search.maxPrice != null ? { maxPrice: search.maxPrice } : {}),
  });

  const studiosQuery = useQuery({
    queryKey: ["discover-studios", filters],
    queryFn: () => fetchDiscoverStudios(filters),
    staleTime: 30_000,
  });

  const facetBits = [search.style, search.locality, search.q]
    .filter((value): value is string => Boolean(value))
    .map(prettySearchBit);
  const cityBit = prettySearchBit(search.city ?? "chennai");
  const title =
    facetBits.length > 0
      ? `Dance studios for ${facetBits.join(" · ")}`
      : `Dance studios in ${cityBit}`;

  return (
    <PublicShell nav="student" width="full">
      <section className={`${shared.section} ${styles.page}`}>
        <div className={shared.sectionInner}>
          <div className={styles.header}>
            <div>
              <p className={styles.eyebrow}>Discover</p>
              <h1 className={shared.title}>{title}</h1>
              <p className={shared.lede}>
                Browse Chennai dance studios. Open a studio to request a trial.
              </p>
            </div>
            <Link to="/" className={styles.back}>
              Back to home
            </Link>
          </div>

          {studiosQuery.isLoading ? (
            <div className={styles.grid}>
              {["a", "b", "c", "d", "e", "f"].map((id) => (
                <StudioCardSkeleton key={id} />
              ))}
            </div>
          ) : null}

          {studiosQuery.data && studiosQuery.data.length > 0 ? (
            <div className={styles.grid}>
              {studiosQuery.data.map((studio) => (
                <StudioCard key={studio.id} studio={studio} />
              ))}
            </div>
          ) : null}

          {studiosQuery.data && studiosQuery.data.length === 0 ? (
            <p className={styles.empty}>
              No dance studios match these filters yet. Try another area or
              style.
            </p>
          ) : null}

          {studiosQuery.isError ? (
            <p className={styles.empty}>
              Could not load studios. Please try again.
            </p>
          ) : null}
        </div>
      </section>
    </PublicShell>
  );
}
