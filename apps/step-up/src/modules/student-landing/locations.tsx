import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import shared from "@/modules/marketing/marketing.module.scss";
import { Reveal } from "@/modules/marketing/reveal";
import { fetchDiscoverCities } from "./api";
import { STUDENT_LOCATIONS } from "./content";
import styles from "./locations.module.scss";
import { LAUNCH_CITY_IDS } from "./types";

export function StudentLocations() {
  const citiesQuery = useQuery({
    queryKey: ["discover-cities"],
    queryFn: fetchDiscoverCities,
    staleTime: 60_000,
  });

  const cities = (citiesQuery.data ?? []).filter((city) =>
    (LAUNCH_CITY_IDS as readonly string[]).includes(city.id),
  );

  return (
    <section
      className={`${shared.section} ${styles.section}`}
      aria-labelledby="locations-headline"
    >
      <div className={shared.sectionInner}>
        <Reveal>
          <h2 id="locations-headline" className={shared.title}>
            {STUDENT_LOCATIONS.headline}
          </h2>
          <p className={shared.lede}>{STUDENT_LOCATIONS.support}</p>
        </Reveal>
        <div className={styles.grid}>
          {cities.map((city, index) => {
            const hasStudios = city.studioCount > 0;
            const content = (
              <>
                <span className={styles.name}>{city.label}</span>
                <span className={styles.meta}>
                  {hasStudios
                    ? `${city.studioCount} studio${city.studioCount === 1 ? "" : "s"}`
                    : STUDENT_LOCATIONS.comingSoon}
                </span>
              </>
            );
            return (
              <Reveal key={city.id} delay={index * 40}>
                {hasStudios ? (
                  <Link
                    to="/discover"
                    search={{ city: city.id }}
                    className={styles.card}
                  >
                    {content}
                  </Link>
                ) : (
                  <div className={styles.card} data-soon="">
                    {content}
                  </div>
                )}
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
