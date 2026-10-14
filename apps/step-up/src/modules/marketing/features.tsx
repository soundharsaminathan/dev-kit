import { FEATURES } from "./content";
import styles from "./features.module.scss";
import shared from "./marketing.module.scss";
import { Shot } from "./product-shots";
import { Reveal } from "./reveal";

export function Features() {
  return (
    <section
      id="features"
      className={`${shared.section} ${styles.features}`}
      aria-labelledby="features-headline"
    >
      <div className={shared.sectionInner}>
        <Reveal className={styles.intro}>
          <h2 id="features-headline" className={shared.title}>
            {FEATURES.headline}
          </h2>
        </Reveal>

        <div className={styles.list}>
          {FEATURES.items.map((item, i) => {
            const reverse = i % 2 === 1;
            const step = String(i + 1).padStart(2, "0");
            return (
              <Reveal
                key={item.id}
                delay={60}
                className={[styles.row, reverse ? styles.rowReverse : ""].join(
                  " ",
                )}
              >
                <div className={styles.copy}>
                  <p className={styles.step} aria-hidden>
                    {step}
                  </p>
                  <h3 className={styles.itemTitle}>{item.title}</h3>
                  <p className={styles.itemBody}>{item.body}</p>
                </div>
                <div className={styles.shotWrap}>
                  <Shot id={item.shot} />
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
