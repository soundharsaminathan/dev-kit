import { Link } from "@tanstack/react-router";
import shared from "@/modules/marketing/marketing.module.scss";
import { Reveal } from "@/modules/marketing/reveal";
import styles from "./browse.module.scss";
import { useDiscoverCity } from "./city-context";
import { STUDENT_STYLES } from "./content";
import { useDiscoverLanding } from "./use-landing";

export function StudentBrowseStyles() {
  const { cityId } = useDiscoverCity();
  const landing = useDiscoverLanding();
  const items = landing.data?.styles ?? [];
  if (items.length === 0) return null;

  return (
    <section
      className={`${shared.section} ${styles.section}`}
      aria-labelledby="styles-headline"
    >
      <div className={shared.sectionInner}>
        <Reveal>
          <h2 id="styles-headline" className={shared.title}>
            {STUDENT_STYLES.headline}
          </h2>
          <p className={shared.lede}>{STUDENT_STYLES.support}</p>
        </Reveal>
        <div className={styles.grid}>
          {items.map((style, index) => (
            <Reveal key={style.id} delay={index * 30}>
              <Link
                to="/discover"
                search={{
                  city: cityId,
                  category: "DANCE",
                  style: style.id,
                }}
                className={styles.card}
              >
                <span className={styles.name}>{style.label}</span>
                <span className={styles.meta}>
                  {style.studioCount} studio
                  {style.studioCount === 1 ? "" : "s"}
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
