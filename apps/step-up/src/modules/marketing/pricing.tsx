import { Button } from "@dev-ui/components/button";
import { Link } from "@tanstack/react-router";
import type { ComponentType } from "react";
import { PRICING } from "./content";
import {
  ArrowRightIcon,
  CalendarBlankIcon,
  CheckIcon,
  HeadsetIcon,
  LeafIcon,
  LockSimpleIcon,
  RocketLaunchIcon,
  ShieldCheckIcon,
  UserIcon,
  UsersIcon,
  UsersThreeIcon,
} from "./icons";
import shared from "./marketing.module.scss";
import styles from "./pricing.module.scss";
import { Reveal } from "./reveal";

const PLAN_ICONS = {
  leaf: LeafIcon,
  rocket: RocketLaunchIcon,
} as const;

const LIMIT_ICONS = {
  users: UsersIcon,
  calendar: CalendarBlankIcon,
  user: UserIcon,
  shield: ShieldCheckIcon,
  staff: UsersThreeIcon,
} as const;

const ASSURANCE_ICONS = {
  shield: ShieldCheckIcon,
  headset: HeadsetIcon,
  lock: LockSimpleIcon,
} as const;

type IconComponent = ComponentType<{ className: string }>;

function PlanIcon({ name }: { name: keyof typeof PLAN_ICONS }) {
  const Icon: IconComponent = PLAN_ICONS[name];
  return <Icon className={styles.planGlyph ?? ""} />;
}

function LimitIcon({ name }: { name: keyof typeof LIMIT_ICONS }) {
  const Icon: IconComponent = LIMIT_ICONS[name];
  return <Icon className={styles.limitGlyph ?? ""} />;
}

function AssuranceIcon({ name }: { name: keyof typeof ASSURANCE_ICONS }) {
  const Icon: IconComponent = ASSURANCE_ICONS[name];
  return <Icon className={styles.assuranceGlyph ?? ""} />;
}

export function Pricing() {
  return (
    <section
      id="pricing"
      className={`${shared.section} ${styles.pricing}`}
      aria-labelledby="pricing-headline"
    >
      <div className={shared.sectionInner}>
        <Reveal className={styles.intro}>
          <p className={styles.eyebrow}>{PRICING.eyebrow}</p>
          <h2 id="pricing-headline" className={shared.title}>
            {PRICING.headline}
          </h2>
          <p className={shared.lede}>{PRICING.support}</p>
          <p className={styles.cadenceBar}>
            <span className={styles.cadenceChip}>{PRICING.cadence}</span>
            <span className={styles.cadenceHint}>{PRICING.cadenceHint}</span>
          </p>
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
              ) : null}

              <div className={styles.planHead}>
                <span className={styles.planIcon} aria-hidden>
                  <PlanIcon name={plan.icon} />
                </span>
                <div className={styles.planCopy}>
                  <h3 className={styles.name}>{plan.name}</h3>
                  <p className={styles.pitch}>{plan.pitch}</p>
                </div>
              </div>

              <p className={styles.priceRow}>
                <span className={styles.price}>{plan.price}</span>
                <span className={styles.cadence}>{plan.cadence}</span>
              </p>

              <ul className={styles.limits} aria-label={`${plan.name} limits`}>
                {plan.limits.map((item) => (
                  <li key={item.label}>
                    <span className={styles.limitIcon} aria-hidden>
                      <LimitIcon name={item.icon} />
                    </span>
                    <span className={styles.limitValue}>{item.value}</span>
                    <span className={styles.limitLabel}>{item.label}</span>
                  </li>
                ))}
              </ul>

              <ul
                className={styles.includes}
                aria-label={`${plan.name} includes`}
              >
                {plan.includes.map((item) => (
                  <li key={item}>
                    <span className={styles.check} aria-hidden>
                      <CheckIcon className={styles.checkGlyph ?? ""} />
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
                  <ArrowRightIcon className={styles.ctaArrow ?? ""} />
                </Button>
              </Link>
            </Reveal>
          ))}
        </div>

        <Reveal delay={160}>
          <ul className={styles.assurances} aria-label="Plan assurances">
            {PRICING.assurances.map((item) => (
              <li key={item.id} className={styles.assurance}>
                <span className={styles.assuranceIcon} aria-hidden>
                  <AssuranceIcon name={item.icon} />
                </span>
                <p className={styles.assuranceTitle}>{item.title}</p>
                <p className={styles.assuranceBody}>{item.body}</p>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
