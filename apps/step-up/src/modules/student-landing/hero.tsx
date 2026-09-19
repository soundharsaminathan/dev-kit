import { Button } from "@dev-ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useMemo, useState } from "react";
import shared from "@/modules/marketing/marketing.module.scss";
import { fetchDiscoverCities, fetchDiscoverStudios } from "./api";
import { STUDENT_HERO } from "./content";
import { formatDistance, formatPriceFrom, formatRating } from "./format";
import styles from "./hero.module.scss";

export function StudentHero() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");

  const citiesQuery = useQuery({
    queryKey: ["discover-cities"],
    queryFn: fetchDiscoverCities,
    staleTime: 60_000,
  });

  const floatQuery = useQuery({
    queryKey: ["discover-studios", { limit: 2, city: city || undefined }],
    queryFn: () => {
      const params: Parameters<typeof fetchDiscoverStudios>[0] = { limit: 2 };
      if (city) params.city = city;
      return fetchDiscoverStudios(params);
    },
    staleTime: 60_000,
  });

  const cityOptions = useMemo(() => citiesQuery.data ?? [], [citiesQuery.data]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const search: {
      q?: string;
      city?: string;
    } = {};
    const trimmed = q.trim();
    if (trimmed) search.q = trimmed;
    if (city) search.city = city;
    void navigate({
      to: "/discover",
      search,
    });
  };

  return (
    <section className={styles.hero} aria-labelledby="student-hero-headline">
      <div className={styles.stage}>
        <div className={styles.copy}>
          <h1 id="student-hero-headline" className={styles.headline}>
            {STUDENT_HERO.headline}
          </h1>
          <p className={`${shared.lede} ${styles.support}`}>
            {STUDENT_HERO.support}
          </p>

          <form className={styles.search} onSubmit={onSubmit}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>What</span>
              <input
                className={styles.input}
                type="search"
                name="q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={STUDENT_HERO.searchPlaceholder}
                autoComplete="off"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Where</span>
              <select
                className={styles.select}
                name="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              >
                <option value="">{STUDENT_HERO.locationPlaceholder}</option>
                {cityOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                    {option.studioCount > 0 ? ` (${option.studioCount})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" variant="primary" className={styles.submit}>
              {STUDENT_HERO.searchCta}
            </Button>
          </form>

          <p className={styles.proof}>
            <Link
              to="/discover"
              search={city ? { city } : {}}
              className={styles.proofLink}
            >
              {STUDENT_HERO.proof}
              <span className={styles.proofArrow} aria-hidden>
                →
              </span>
            </Link>
          </p>
        </div>

        <div className={styles.visual} aria-hidden={false}>
          <img
            className={styles.heroImage}
            src="/marketing/student/hero.png"
            alt="classa mark as a studio window into dance class"
            width={864}
            height={1152}
            fetchPriority="high"
            decoding="async"
          />
          <div className={styles.floatStack}>
            {(floatQuery.data ?? []).slice(0, 2).map((studio) => {
              const rating = formatRating(studio.ratingAvg, studio.ratingCount);
              const distance = formatDistance(studio.distanceKm);
              const price = formatPriceFrom(
                studio.priceFrom,
                studio.priceCadence,
              );
              return (
                <Link
                  key={studio.id}
                  to="/studio/$studioId"
                  params={{ studioId: studio.slug || studio.id }}
                  className={styles.floatCard}
                >
                  <strong>{studio.name}</strong>
                  <span>
                    {studio.styles[0] ?? "Studio"}
                    {rating ? ` · ★ ${rating}` : ""}
                  </span>
                  <span>
                    {[distance, price].filter(Boolean).join(" · ") ||
                      studio.city ||
                      "View studio"}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
