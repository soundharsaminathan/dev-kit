import { Link, useNavigate } from "@tanstack/react-router";
import shared from "@/modules/marketing/marketing.module.scss";
import { Reveal } from "@/modules/marketing/reveal";
import styles from "./browse.module.scss";
import { useDiscoverCity } from "./city-context";
import { STUDENT_AREAS } from "./content";
import { useDiscoverLanding } from "./use-landing";

export function StudentBrowseAreas() {
  const navigate = useNavigate();
  const { cityId } = useDiscoverCity();
  const landing = useDiscoverLanding();
  const items = (landing.data?.areas ?? []).filter(
    (area) => area.popular || area.studioCount > 0,
  );

  const useNearMe = () => {
    if (!navigator.geolocation) {
      void navigate({
        to: "/discover",
        search: { city: cityId, category: "dance" },
      });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void navigate({
          to: "/discover",
          search: {
            city: cityId,
            category: "dance",
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            maxKm: 8,
          },
        });
      },
      () => {
        void navigate({
          to: "/discover",
          search: { city: cityId, category: "dance" },
        });
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  };

  return (
    <section
      className={`${shared.section} ${styles.section}`}
      aria-labelledby="areas-headline"
    >
      <div className={shared.sectionInner}>
        <Reveal>
          <h2 id="areas-headline" className={shared.title}>
            {STUDENT_AREAS.headline}
          </h2>
          <p className={shared.lede}>{STUDENT_AREAS.support}</p>
        </Reveal>
        <div className={styles.grid}>
          <Reveal>
            <button type="button" className={styles.card} onClick={useNearMe}>
              <span className={styles.name}>{STUDENT_AREAS.nearMe}</span>
              <span className={styles.meta}>Within 8 km</span>
            </button>
          </Reveal>
          {items.map((area, index) => (
            <Reveal key={area.id} delay={(index + 1) * 30}>
              <Link
                to="/discover"
                search={{
                  city: cityId,
                  category: "dance",
                  locality: area.id,
                }}
                className={styles.card}
              >
                <span className={styles.name}>{area.label}</span>
                <span className={styles.meta}>
                  {area.studioCount > 0
                    ? `${area.studioCount} studio${area.studioCount === 1 ? "" : "s"}`
                    : "Browse nearby"}
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
