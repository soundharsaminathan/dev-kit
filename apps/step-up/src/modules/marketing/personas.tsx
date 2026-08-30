import { PERSONAS } from "./content";
import shared from "./marketing.module.scss";
import styles from "./personas.module.scss";
import { Shot } from "./product-shots";
import { Reveal } from "./reveal";

export function Personas() {
  return (
    <section
      id="solutions"
      className={`${shared.section} ${styles.personas}`}
      aria-labelledby="personas-headline"
    >
      <div className={shared.sectionInner}>
        <Reveal className={styles.intro}>
          <h2 id="personas-headline" className={shared.title}>
            {PERSONAS.headline}
          </h2>
        </Reveal>

        <div className={styles.grid}>
          {PERSONAS.items.map((item, i) => (
            <Reveal
              key={item.id}
              delay={i * 80}
              as="article"
              className={styles.card}
            >
              <Shot id={item.shot} browserChrome={false} ratio="16 / 11" />
              <h3 className={styles.cardTitle}>{item.title}</h3>
              <p className={styles.cardBody}>{item.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
