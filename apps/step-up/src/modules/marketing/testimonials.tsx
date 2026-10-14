import { TESTIMONIALS } from "./content";
import shared from "./marketing.module.scss";
import { Reveal } from "./reveal";
import styles from "./testimonials.module.scss";

export function Testimonials() {
  return (
    <section
      className={`${shared.section} ${styles.testimonials}`}
      aria-labelledby="testimonials-headline"
    >
      <div className={shared.sectionInner}>
        <Reveal className={styles.intro}>
          <h2 id="testimonials-headline" className={shared.title}>
            {TESTIMONIALS.headline}
          </h2>
        </Reveal>

        <div className={styles.grid}>
          {TESTIMONIALS.items.map((item, i) => (
            <Reveal
              key={item.name}
              delay={i * 80}
              as="blockquote"
              className={styles.card}
            >
              <p className={styles.quote}>&ldquo;{item.quote}&rdquo;</p>
              <footer className={styles.meta}>
                <span
                  className={styles.avatar}
                  data-tone={item.tone}
                  aria-hidden
                >
                  {item.initials}
                </span>
                <cite className={styles.name}>{item.name}</cite>
                <span className={styles.role}>
                  {item.role}, {item.studio}
                </span>
              </footer>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
