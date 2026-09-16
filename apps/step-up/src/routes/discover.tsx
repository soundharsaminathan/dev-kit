import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicShell } from "@/modules/layout/public-shell";
import shared from "@/modules/marketing/marketing.module.scss";
import { fetchDiscoverStudios } from "@/modules/student-landing/api";
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
  const filters: DiscoverStudiosQuery = { limit: 24 };
  if (search.q) filters.q = search.q;
  if (search.city) filters.city = search.city;
  if (search.category) filters.category = search.category;
  if (search.audience) filters.audience = search.audience;
  if (search.days) filters.days = search.days;
  if (search.time) filters.time = search.time;
  if (search.lat != null) filters.lat = search.lat;
  if (search.lng != null) filters.lng = search.lng;
  if (search.maxKm != null) filters.maxKm = search.maxKm;
  if (search.maxPrice != null) filters.maxPrice = search.maxPrice;

  const studiosQuery = useQuery({
    queryKey: ["discover-studios", filters],
    queryFn: () => fetchDiscoverStudios(filters),
    staleTime: 30_000,
  });

  const titleBits = [search.q, search.city, search.category].filter(Boolean);

  return (
    <PublicShell nav="student" width="full">
      <section className={`${shared.section} ${styles.page}`}>
        <div className={shared.sectionInner}>
          <div className={styles.header}>
            <div>
              <p className={styles.eyebrow}>Discover</p>
              <h1 className={shared.title}>
                {titleBits.length > 0
                  ? `Results for ${titleBits.join(" · ")}`
                  : "Find a studio"}
              </h1>
              <p className={shared.lede}>
                Browse live studios on classa. Open a studio to join.
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
              No studios match these filters yet. Try another city or category.
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
