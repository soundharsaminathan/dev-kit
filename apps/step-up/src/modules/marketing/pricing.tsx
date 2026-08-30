import { Button } from "@dev-ui/components/button";
import { Link } from "@tanstack/react-router";
import { PRICING } from "./content";
import shared from "./marketing.module.scss";
import styles from "./pricing.module.scss";
import { Reveal } from "./reveal";

export function Pricing() {
  return (
    <section
      id="pricing"
      className={`${shared.section} ${styles.pricing}`}
      aria-labelledby="pricing-headline"
    >
      <div className={shared.sectionInner}>
        <Reveal className={styles.intro}>
          <h2 id="pricing-headline" className={shared.title}>
            {PRICING.headline}
          </h2>
          <p className={shared.lede}>{PRICING.support}</p>
        </Reveal>

        <div className={styles.grid}>
          {PRICING.plans.map((plan, i) => (
            <Reveal
              key={plan.id}
              delay={i * 90}
              as="article"
              className={[
                styles.plan,
                plan.featured ? styles.featured : "",
              ].join(" ")}
            >
              {"badge" in plan && plan.badge ? (
                <p className={styles.badge}>{plan.badge}</p>
              ) : (
                <p className={styles.badgeSpacer} aria-hidden>
                  &nbsp;
                </p>
              )}
              <h3 className={styles.name}>{plan.name}</h3>
              <p className={styles.pitch}>{plan.pitch}</p>
              <p className={styles.priceRow}>
                <span className={styles.price}>{plan.price}</span>
                <span className={styles.cadence}>{plan.cadence}</span>
              </p>

              <ul className={styles.limits} aria-label={`${plan.name} limits`}>
                {plan.limits.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <ul className={styles.includes} aria-label={`${plan.name} includes`}>
                {plan.includes.map((item) => (
                  <li key={item}>
                    <span className={styles.check} aria-hidden>
                      ✓
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <Link
                to="/register"
                className={styles.ctaLink}
                data-testid={`pricing-cta-${plan.id}`}
              >
                <Button
                  variant={plan.featured ? "primary" : "default"}
                  className={shared.cta}
                >
                  {plan.cta}
                </Button>
              </Link>
            </Reveal>
          ))}
        </div>

        <Reveal delay={160}>
          <p className={styles.note}>{PRICING.note}</p>
        </Reveal>
      </div>
    </section>
  );
}
