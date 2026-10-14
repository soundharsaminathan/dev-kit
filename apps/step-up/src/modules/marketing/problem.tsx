import { PROBLEM } from "./content";
import shared from "./marketing.module.scss";
import styles from "./problem.module.scss";
import { Reveal } from "./reveal";

export function Problem() {
  return (
    <section
      className={`${shared.section} ${shared.inverted} ${styles.problem}`}
      aria-labelledby="problem-headline"
    >
      <div className={shared.sectionInner}>
        <Reveal>
          <h2 id="problem-headline" className={shared.title}>
            {PROBLEM.headline}
          </h2>
        </Reveal>

        <div className={styles.fragments}>
          {PROBLEM.fragments.map((item, i) => (
            <Reveal
              key={item.label}
              delay={80 * (i + 1)}
              className={styles.chip}
            >
              <span className={styles.chipLabel}>{item.label}</span>
              <span className={styles.chipArrow} aria-hidden>
                →
              </span>
              <span className={styles.chipTool}>{item.tool}</span>
            </Reveal>
          ))}
        </div>

        <Reveal delay={480} className={styles.resolution}>
          <p className={styles.resolutionTitle}>{PROBLEM.resolution}</p>
          <p className={styles.resolutionSupport}>
            {PROBLEM.resolutionSupport}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
