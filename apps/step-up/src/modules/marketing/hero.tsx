import { Button } from "@dev-ui/components/button";
import { Link } from "@tanstack/react-router";
import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { HERO } from "./content";
import styles from "./hero.module.scss";
import shared from "./marketing.module.scss";
import { DashboardMock } from "./mocks/dashboard";
import { ProductShot } from "./product-shot";
import { Tagline } from "./tagline";

const CYCLE_WORDS = ["students.", "parents."] as const;
const TYPE_MS = 72;
const DELETE_MS = 42;
const HOLD_MS = 1400;

function useTypedCycle(words: readonly string[]) {
  const reduced = useReducedMotion();
  const [text, setText] = useState("");

  useEffect(() => {
    if (reduced) {
      setText(words[0] ?? "");
      return;
    }

    let wordIndex = 0;
    let charIndex = 0;
    let deleting = false;
    let timeout = 0;

    const tick = () => {
      const word = words[wordIndex] ?? "";
      if (!deleting) {
        charIndex += 1;
        setText(word.slice(0, charIndex));
        if (charIndex >= word.length) {
          timeout = window.setTimeout(() => {
            deleting = true;
            tick();
          }, HOLD_MS);
          return;
        }
        timeout = window.setTimeout(tick, TYPE_MS);
        return;
      }

      charIndex -= 1;
      setText(word.slice(0, Math.max(charIndex, 0)));
      if (charIndex <= 0) {
        deleting = false;
        wordIndex = (wordIndex + 1) % words.length;
        timeout = window.setTimeout(tick, TYPE_MS);
        return;
      }
      timeout = window.setTimeout(tick, DELETE_MS);
    };

    timeout = window.setTimeout(tick, TYPE_MS);
    return () => window.clearTimeout(timeout);
  }, [reduced, words]);

  return text;
}

export function Hero() {
  const typed = useTypedCycle(CYCLE_WORDS);
  const sizer = CYCLE_WORDS.reduce((a, b) => (a.length >= b.length ? a : b));

  return (
    <section className={styles.hero} aria-labelledby="hero-headline">
      <div className={styles.stage}>
        <div className={styles.copy}>
          <h1
            id="hero-headline"
            className={styles.headline}
            aria-label={`${HERO.headlineLine1} without chasing students or parents.`}
          >
            <span className={styles.line} aria-hidden>
              {HERO.headlineLine1}
            </span>
            <span className={styles.line} aria-hidden>
              <span className={styles.fill}>without chasing </span>
              <span className={styles.cycleWrapper}>
                <span className={styles.cycleSizer}>{sizer}</span>
                <span className={styles.cycleLive}>
                  <span className={styles.cycleWord}>{typed}</span>
                  <span className={styles.caret} />
                </span>
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
