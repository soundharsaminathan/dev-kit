import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import shared from "@/modules/marketing/marketing.module.scss";
import { Reveal } from "@/modules/marketing/reveal";
import { fetchDiscoverCities, fetchDiscoverStudios } from "./api";
import { STUDENT_NEARBY } from "./content";
import styles from "./nearby.module.scss";
import { StudioCard, StudioCardSkeleton } from "./studio-card";

export function StudentNearby() {
  const [city, setCity] = useState("");
  const citiesQuery = useQuery({
    queryKey: ["discover-cities"],
    queryFn: fetchDiscoverCities,
    staleTime: 60_000,
  });
  const studiosQuery = useQuery({
    queryKey: ["discover-studios", { city: city || undefined, limit: 8 }],
    queryFn: () => {
      const params: Parameters<typeof fetchDiscoverStudios>[0] = { limit: 8 };
      if (city) params.city = city;
      return fetchDiscoverStudios(params);
    },
    staleTime: 30_000,
  });

  return (
    <section
      id="discover"
      className={`${shared.section} ${styles.section}`}
      aria-labelledby="nearby-headline"
    >
      <div className={shared.sectionInner}>
        <Reveal>
          <div className={styles.header}>
            <div>
              <h2 id="nearby-headline" className={shared.title}>
                {STUDENT_NEARBY.headline}
              </h2>
              <p className={shared.lede}>{STUDENT_NEARBY.support}</p>
            </div>
            <label className={styles.city}>
              <span className={styles.cityLabel}>Location</span>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                aria-label="Select city"
              >
                <option value="">All cities</option>
                {(citiesQuery.data ?? []).map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </Reveal>

        {studiosQuery.isLoading ? (
          <div className={styles.grid}>
            {["a", "b", "c", "d"].map((id) => (
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
          <div className={styles.empty}>
            <p>{STUDENT_NEARBY.empty}</p>
            <div className={styles.altCities}>
              {(citiesQuery.data ?? [])
                .filter((c) => c.studioCount > 0)
                .slice(0, 4)
                .map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={styles.chip}
                    onClick={() => setCity(c.id)}
                  >
                    {c.label}
                  </button>
                ))}
              <Link to="/discover" className={styles.chip}>
                Browse all
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
