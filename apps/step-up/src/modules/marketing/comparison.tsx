import {
  type CSSProperties,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import styles from "./comparison.module.scss";
import {
  BackdropSwirls,
  DatabaseAccent,
  FolderAccent,
  GearsAccent,
  Sparkle,
} from "./comparison-art";
import { COMPARISON } from "./content";
import shared from "./marketing.module.scss";
import { Reveal } from "./reveal";

const OLD_ACCENT: Record<number, "folder"> = { 0: "folder" };
const FRESH_ACCENT: Record<number, "gears" | "database"> = {
  1: "gears",
  4: "database",
};

export function Comparison() {
  const stageRef = useRef<HTMLDivElement>(null);
  const fromRefs = useRef<(HTMLElement | null)[]>([]);
  const toRefs = useRef<(HTMLElement | null)[]>([]);
  const [paths, setPaths] = useState<string[]>([]);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDrawn(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setDrawn(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.25 },
    );

    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    let cancelled = false;
    const update = () => {
      if (cancelled) return;
      if (window.matchMedia("(max-width: 767px)").matches) {
        setPaths([]);
        return;
      }
      const origin = stage.getBoundingClientRect();
      setBox({ w: origin.width, h: origin.height });
      const next: string[] = [];
      for (let i = 0; i < COMPARISON.oldWay.items.length; i++) {
        const from = fromRefs.current[i];
        const to = toRefs.current[i];
        if (!from || !to) continue;
        const a = from.getBoundingClientRect();
        const b = to.getBoundingClientRect();
        const x1 = a.right - origin.left + 6;
        const y1 = a.top + a.height / 2 - origin.top;
        const x2 = b.left - origin.left - 6;
        const y2 = b.top + b.height / 2 - origin.top;
        const dx = Math.max(28, (x2 - x1) * 0.48);
        const wobble = (i % 2 === 0 ? -1 : 1) * 8;
        next.push(
          `M ${x1} ${y1} C ${x1 + dx} ${y1 + wobble}, ${x2 - dx} ${y2 - wobble}, ${x2} ${y2}`,
        );
      }
      setPaths(next);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(stage);
    void document.fonts?.ready.then(update);
    window.addEventListener("resize", update);
    return () => {
      cancelled = true;
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <section
      className={`${shared.section} ${shared.inverted} ${styles.section}`}
      aria-labelledby="comparison-headline"
    >
      <div className={styles.backdrop} aria-hidden>
        <BackdropSwirls />
      </div>
      <div className={styles.glow} aria-hidden />
      <span className={styles.sparkle} aria-hidden>
        <Sparkle />
      </span>

      <div className={`${shared.sectionInner} ${styles.inner}`}>
        <Reveal className={styles.intro}>
          <h2 id="comparison-headline" className={styles.headline}>
            {COMPARISON.headline}
          </h2>
        </Reveal>

        <Reveal delay={80}>
          <div ref={stageRef} className={styles.stage}>
            {box.w > 0 && paths.length > 0 ? (
              <svg
                className={`${styles.connectors} ${drawn ? styles.draw : ""}`}
                viewBox={`0 0 ${box.w} ${box.h}`}
                aria-hidden
              >
                <title>Lines pairing each old habit with classa</title>
                {paths.map((d, i) => (
                  <path
                    key={COMPARISON.oldWay.items[i] ?? d}
                    d={d}
                    pathLength={1}
                    style={{ "--line-index": i } as CSSProperties}
                  />
                ))}
              </svg>
            ) : null}

            <article className={styles.old}>
              <h3 className={styles.colTitle}>{COMPARISON.oldWay.title}</h3>
              <ul className={styles.list}>
                {COMPARISON.oldWay.items.map((item, i) => (
                  <li key={item} className={styles.oldItem}>
                    <span className={styles.x} aria-hidden>
                      ×
                    </span>
                    <span className={styles.label}>{item}</span>
                    {OLD_ACCENT[i] === "folder" ? (
                      <span className={styles.accent} aria-hidden>
                        <FolderAccent />
                      </span>
                    ) : null}
                    <span
                      ref={(el) => {
                        fromRefs.current[i] = el;
                      }}
                      className={styles.fromAnchor}
                    />
                  </li>
                ))}
              </ul>
            </article>

            <article className={styles.fresh}>
              <h3 className={styles.colTitle}>{COMPARISON.withStepUp.title}</h3>
              <ul className={styles.list}>
                {COMPARISON.withStepUp.items.map((item, i) => (
                  <li key={item} className={styles.freshItem}>
                    <span
                      ref={(el) => {
                        toRefs.current[i] = el;
                      }}
                      className={styles.check}
                      aria-hidden
                    >
                      <svg viewBox="0 0 16 16" aria-hidden>
                        <title>Included</title>
                        <path
                          d="M3.6 8.2 L6.6 11.1 L12.4 4.8"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <span className={styles.label}>{item}</span>
                    {FRESH_ACCENT[i] === "gears" ? (
                      <span
                        className={`${styles.accent} ${styles.accentGears}`}
                        aria-hidden
                      >
                        <GearsAccent />
                      </span>
                    ) : null}
                    {FRESH_ACCENT[i] === "database" ? (
                      <span
                        className={`${styles.accent} ${styles.accentDb}`}
                        aria-hidden
                      >
                        <DatabaseAccent />
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
