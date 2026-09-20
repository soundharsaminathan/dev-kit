import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import shared from "@/modules/marketing/marketing.module.scss";
import { Reveal } from "@/modules/marketing/reveal";
import { danceDiscoverQuery, fetchDiscoverStudios } from "./api";
import { useDiscoverCity } from "./city-context";
import { STUDENT_NEARBY } from "./content";
import styles from "./nearby.module.scss";
import { StudioCard, StudioCardSkeleton } from "./studio-card";
import type { DiscoverStudiosQuery } from "./types";
import { useDiscoverLanding } from "./use-landing";

type Chip =
  | { id: string; label: string; clear: true }
  | { id: string; label: string; patch: Partial<DiscoverStudiosQuery> };

export function StudentStudioGrid() {
  const { cityId, cityLabel } = useDiscoverCity();
  const landing = useDiscoverLanding();
  const [active, setActive] = useState("all");
  const chips: Chip[] = useMemo(
    () => [
      { id: "all", label: "All", clear: true },
      { id: "kids", label: STUDENT_NEARBY.kids, patch: { audience: "KIDS" } },
      {
        id: "adults",
        label: STUDENT_NEARBY.adults,
        patch: { audience: "ADULTS" },
      },
      {
        id: "evening",
        label: STUDENT_NEARBY.evening,
        patch: { time: "evening" },
      },
      {
        id: "weekend",
        label: STUDENT_NEARBY.weekend,
        patch: { days: "weekend" },
      },
    ],
    [],
  );

  const filters = useMemo((): DiscoverStudiosQuery => {
    const chip = chips.find((item) => item.id === active);
    const base = danceDiscoverQuery({ city: cityId, limit: 8 });
    if (!chip || "clear" in chip) return base;
    return { ...base, ...chip.patch };
  }, [active, chips, cityId]);

  const useLandingList = active === "all";
  const studiosQuery = useQuery({
    queryKey: ["discover-studios", filters],
    queryFn: () => fetchDiscoverStudios(filters),
    staleTime: 30_000,
    enabled: !useLandingList,
  });

  const studios = useLandingList
    ? (landing.data?.studios ?? [])
    : (studiosQuery.data ?? []);
  const loading = useLandingList ? landing.isLoading : studiosQuery.isLoading;

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
                {STUDENT_NEARBY.headline(cityLabel)}
              </h2>
              <p className={shared.lede}>{STUDENT_NEARBY.support}</p>
            </div>
            <Link
              to="/discover"
              search={{ city: cityId, category: "DANCE" }}
              className={styles.chip}
            >
              {STUDENT_NEARBY.seeAll}
            </Link>
          </div>
        </Reveal>

        <div className={styles.altCities}>
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className={styles.chip}
              data-active={active === chip.id || undefined}
              aria-pressed={active === chip.id}
              onClick={() => setActive(chip.id)}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className={styles.grid}>
            {["a", "b", "c", "d"].map((id) => (
              <StudioCardSkeleton key={id} />
            ))}
          </div>
        ) : null}

        {!loading && studios.length > 0 ? (
          <div className={styles.grid}>
            {studios.map((studio) => (
              <StudioCard key={studio.id} studio={studio} />
            ))}
          </div>
        ) : null}

        {!loading && studios.length === 0 ? (
          <div className={styles.empty}>
            <p>
              {landing.data?.city.available === false
                ? STUDENT_NEARBY.emptyCity
                : STUDENT_NEARBY.empty}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
