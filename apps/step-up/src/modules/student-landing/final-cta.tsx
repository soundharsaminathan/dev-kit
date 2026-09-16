import { Button } from "@dev-ui/components/button";
import { Link } from "@tanstack/react-router";
import shared from "@/modules/marketing/marketing.module.scss";
import { Reveal } from "@/modules/marketing/reveal";
import { STUDENT_FINAL_CTA } from "./content";
import styles from "./final-cta.module.scss";

export function StudentFinalCta() {
  return (
    <section
      className={`${shared.section} ${shared.inverted} ${styles.section}`}
      aria-labelledby="final-cta-headline"
    >
      <div className={shared.sectionInner}>
        <Reveal>
          <h2 id="final-cta-headline" className={shared.title}>
            {STUDENT_FINAL_CTA.headline}
          </h2>
          <p className={shared.lede}>{STUDENT_FINAL_CTA.support}</p>
          <div className={styles.actions}>
            <Link to="/discover" className={styles.primary}>
              <Button variant="primary">{STUDENT_FINAL_CTA.primary}</Button>
            </Link>
            <Link to="/discover" className={styles.secondary}>
              {STUDENT_FINAL_CTA.secondary}
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
