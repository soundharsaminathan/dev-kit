import { Button } from "@dev-ui/components/button";
import { Link } from "@tanstack/react-router";
import { FINAL_CTA } from "./content";
import styles from "./final-cta.module.scss";
import shared from "./marketing.module.scss";
import { Reveal } from "./reveal";

export function FinalCta() {
  return (
    <section
      className={`${shared.section} ${shared.inverted} ${styles.final}`}
      aria-labelledby="final-cta-headline"
    >
      <div className={`${shared.sectionInner} ${styles.inner}`}>
        <Reveal>
          <h2 id="final-cta-headline" className={styles.headline}>
            <span className={styles.line}>{FINAL_CTA.headlineLine1}</span>
            <span className={styles.line}>{FINAL_CTA.headlineLine2}</span>
          </h2>
          <p className={styles.support}>{FINAL_CTA.support}</p>
          <p className={styles.risk}>{FINAL_CTA.risk}</p>
          <div className={styles.actions}>
            <Link to="/register" className={styles.ctaLink}>
              <Button variant="primary" className={shared.cta}>
                {FINAL_CTA.primaryCta}
              </Button>
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
