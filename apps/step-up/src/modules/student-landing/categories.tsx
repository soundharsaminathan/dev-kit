import { Link } from "@tanstack/react-router";
import shared from "@/modules/marketing/marketing.module.scss";
import { Reveal } from "@/modules/marketing/reveal";
import styles from "./categories.module.scss";
import { STUDENT_CATEGORIES } from "./content";
import { CATEGORY_META } from "./types";

export function StudentCategories() {
  return (
    <section
      id="categories"
      className={`${shared.section} ${styles.section}`}
      aria-labelledby="categories-headline"
    >
      <div className={shared.sectionInner}>
        <Reveal>
          <h2 id="categories-headline" className={shared.title}>
            {STUDENT_CATEGORIES.headline}
          </h2>
        </Reveal>
        <div className={styles.rail}>
          {CATEGORY_META.map((category, index) => (
            <Reveal key={category.id} delay={index * 40} as="div">
              <Link
                to="/discover"
                search={{ category: category.id }}
                className={styles.card}
              >
                <img
                  src={category.image}
                  alt=""
                  className={styles.image}
                  loading="lazy"
                />
                <span className={styles.label}>{category.label}</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
