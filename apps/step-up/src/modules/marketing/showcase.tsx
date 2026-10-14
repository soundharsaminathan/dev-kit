import { useReducedMotion } from "motion/react";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { SHOWCASE } from "./content";
import shared from "./marketing.module.scss";
import type { ShotId } from "./product-shots";
import { Shot } from "./product-shots";
import { Reveal } from "./reveal";
import styles from "./showcase.module.scss";

const STACK: { id: ShotId; offset: number }[] = [
  { id: "dashboard", offset: 0 },
  { id: "batches", offset: 1 },
  { id: "attendance", offset: 2 },
  { id: "studentProfile", offset: 3 },
  { id: "invoice", offset: 4 },
  { id: "schedule", offset: 5 },
  { id: "certificate", offset: 6 },
];

export function Showcase() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const [shift, setShift] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;

    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const viewH = window.innerHeight || 1;
      const mid = rect.top + rect.height / 2 - viewH / 2;
      setShift(Math.max(-18, Math.min(18, -mid * 0.04)));
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [reduced]);

  return (
    <section
      className={`${shared.section} ${styles.showcase}`}
      aria-labelledby="showcase-headline"
    >
      <div className={shared.sectionInner}>
        <Reveal className={styles.intro}>
          <h2 id="showcase-headline" className={shared.title}>
            {SHOWCASE.headline}
          </h2>
          <p className={shared.lede}>{SHOWCASE.support}</p>
        </Reveal>

        {/* Desktop layered stack */}
        <div ref={ref} className={styles.stack} aria-hidden={false}>
          {STACK.map((item, i) => (
            <div
              key={item.id}
              className={styles.layer}
              style={
                {
                  "--i": String(i),
                  "--shift": reduced ? "0px" : `${shift * (1 + i * 0.15)}px`,
                } as CSSProperties
              }
            >
              <Shot id={item.id} browserChrome={i === 0} />
            </div>
          ))}
        </div>

        {/* Mobile horizontal snap carousel */}
        <div className={styles.carousel}>
          {STACK.map((item) => (
            <div key={item.id} className={styles.slide}>
              <Shot id={item.id} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
