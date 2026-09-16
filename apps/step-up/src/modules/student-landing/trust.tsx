import { useQuery } from "@tanstack/react-query";
import shared from "@/modules/marketing/marketing.module.scss";
import { Reveal } from "@/modules/marketing/reveal";
import { fetchDiscoverStats } from "./api";
import { STUDENT_TRUST } from "./content";
import styles from "./trust.module.scss";

export function StudentTrust() {
  const statsQuery = useQuery({
    queryKey: ["discover-stats"],
    queryFn: fetchDiscoverStats,
    staleTime: 60_000,
  });

  const stats = statsQuery.data;
  if (!stats) {
    return (
      <section
        className={`${shared.section} ${styles.section}`}
        aria-labelledby="trust-headline"
      >
        <div className={shared.sectionInner}>
          <Reveal>
            <h2 id="trust-headline" className={shared.title}>
              {STUDENT_TRUST.headline}
            </h2>
          </Reveal>
          <div className={styles.grid}>
            {["a", "b", "c"].map((id) => (
              <div key={id} className={styles.skeleton} aria-hidden />
            ))}
          </div>
        </div>
      </section>
    );
  }

  const items = [
    { label: STUDENT_TRUST.studios, value: stats.studios },
    { label: STUDENT_TRUST.classes, value: stats.classes },
    { label: STUDENT_TRUST.learners, value: stats.learners },
  ];

  return (
    <section
      className={`${shared.section} ${styles.section}`}
      aria-labelledby="trust-headline"
    >
      <div className={shared.sectionInner}>
        <Reveal>
          <h2 id="trust-headline" className={shared.title}>
            {STUDENT_TRUST.headline}
          </h2>
        </Reveal>
        <div className={styles.grid}>
          {items.map((item, index) => (
            <Reveal key={item.label} delay={index * 40}>
              <div className={styles.stat}>
                <p className={styles.value}>
                  {new Intl.NumberFormat("en-IN").format(item.value)}
                </p>
                <p className={styles.label}>{item.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
