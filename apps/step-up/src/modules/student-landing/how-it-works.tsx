import shared from "@/modules/marketing/marketing.module.scss";
import { Reveal } from "@/modules/marketing/reveal";
import { STUDENT_HOW } from "./content";
import styles from "./how-it-works.module.scss";

export function StudentHowItWorks() {
  return (
    <section
      id="how-it-works"
      className={`${shared.section} ${styles.section}`}
      aria-labelledby="how-headline"
    >
      <div className={shared.sectionInner}>
        <Reveal>
          <h2 id="how-headline" className={shared.title}>
            {STUDENT_HOW.headline}
          </h2>
        </Reveal>
        <ol className={styles.steps}>
          {STUDENT_HOW.steps.map((step, index) => (
            <Reveal key={step.id} as="li" delay={index * 60}>
              <article className={styles.step}>
                <span className={styles.number}>{step.number}</span>
                <h3 className={styles.title}>{step.title}</h3>
                <p className={styles.body}>{step.body}</p>
              </article>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
