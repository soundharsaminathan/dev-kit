import { HOW_IT_WORKS } from "./content";
import styles from "./how-it-works.module.scss";
import { ChartLineIcon, ClipboardTextIcon, UserPlusIcon } from "./icons";
import shared from "./marketing.module.scss";
import { Reveal } from "./reveal";

const ICONS = [UserPlusIcon, ClipboardTextIcon, ChartLineIcon] as const;

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className={`${shared.section} ${styles.how}`}
      aria-labelledby="how-headline"
    >
      <div className={shared.sectionInner}>
        <Reveal className={styles.intro}>
          <h2 id="how-headline" className={shared.title}>
            {HOW_IT_WORKS.headline}
          </h2>
        </Reveal>

        <ol className={styles.list}>
          {HOW_IT_WORKS.steps.map((step, i) => {
            const Icon = ICONS[i];
            return (
              <Reveal
                key={step.id}
                delay={i * 80}
                as="li"
                className={styles.card}
              >
                <span className={styles.iconWrap}>
                  {Icon ? <Icon className={styles.icon ?? ""} /> : null}
                </span>
                <p className={styles.num} aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className={styles.cardTitle}>{step.title}</h3>
                <p className={styles.cardBody}>{step.body}</p>
              </Reveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
