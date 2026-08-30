import { Button } from "@dev-ui/components/button";
import { Link } from "@tanstack/react-router";
import { HERO } from "./content";
import styles from "./hero.module.scss";
import shared from "./marketing.module.scss";
import { DashboardMock } from "./mocks/dashboard";
import { ProductShot } from "./product-shot";
import { Tagline } from "./tagline";

const CYCLE_WORDS = ["parents", "students"] as const;

export function Hero() {
  return (
    <section className={styles.hero} aria-labelledby="hero-headline">
      <div className={styles.stage}>
        <div className={styles.copy}>
          <h1 id="hero-headline" className={styles.headline}>
            <span className={styles.line}>{HERO.headlineLine1}</span>
            <span className={styles.line}>
              without chasing{" "}
              <span className={styles.cycleWrapper}>
                {CYCLE_WORDS.map((word, i) => (
                  <span
                    key={word}
                    className={styles.cycleWord}
                    style={{ animationDelay: `${i * 2.5}s` }}
                  >
                    {word}
                  </span>
                ))}
              </span>
            </span>
          </h1>
          <p className={styles.support}>{HERO.support}</p>
          <div className={styles.actions}>
            <Link to="/register" className={styles.ctaLink}>
              <Button variant="primary" className={shared.cta}>
                {HERO.primaryCta}
              </Button>
            </Link>
            <p className={styles.proof}>{HERO.proof}</p>
          </div>
          <Tagline compact inline />
        </div>
        <div className={styles.visual}>
          <ProductShot
            className={styles.shot}
            alt="classa studio dashboard with today's classes, attendance, and payments"
            ratio="16 / 10"
            layout="desktop"
          >
            <DashboardMock />
          </ProductShot>
        </div>
      </div>
    </section>
  );
}
