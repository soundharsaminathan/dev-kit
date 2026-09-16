import shared from "@/modules/marketing/marketing.module.scss";
import { Reveal } from "@/modules/marketing/reveal";
import styles from "./benefits.module.scss";
import { STUDENT_BENEFITS } from "./content";

export function StudentBenefits() {
  return (
    <section
      id="for-students"
      className={`${shared.section} ${styles.section}`}
      aria-labelledby="benefits-headline"
    >
      <div className={shared.sectionInner}>
        <Reveal>
          <h2 id="benefits-headline" className={shared.title}>
            {STUDENT_BENEFITS.headline}
          </h2>
        </Reveal>
        <div className={styles.grid}>
          {STUDENT_BENEFITS.items.map((item, index) => (
            <Reveal key={item.id} delay={index * 40}>
              <article className={styles.card}>
                <h3 className={styles.title}>{item.title}</h3>
                <p className={styles.body}>{item.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
