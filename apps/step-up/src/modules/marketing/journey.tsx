import { Link } from "@tanstack/react-router";
import { type MutableRefObject, useEffect, useRef, useState } from "react";
import { TouchButton } from "@/modules/ui/touch-button";
import { JOURNEY } from "./content";
import styles from "./journey.module.scss";
import shared from "./marketing.module.scss";
import type { ShotId } from "./product-shots";
import { Shot } from "./product-shots";
import { Reveal } from "./reveal";

const NODE_COUNT = JOURNEY.nodes.length;

function useActiveStage(refs: MutableRefObject<(HTMLElement | null)[]>) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const nodes = refs.current.filter(Boolean) as HTMLElement[];
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0];
        if (!top?.target) return;
        const idx = nodes.indexOf(top.target as HTMLElement);
        if (idx >= 0) setActive(idx);
      },
      { rootMargin: "-30% 0px -40% 0px", threshold: [0.15, 0.4, 0.7] },
    );

    for (const el of nodes) observer.observe(el);
    return () => observer.disconnect();
  }, [refs]);

  return active;
}

export function Journey() {
  const stageRefs = useRef<(HTMLElement | null)[]>([]);
  const active = useActiveStage(stageRefs);

  return (
    <section
      id="features"
      className={styles.journey}
      aria-labelledby="journey-headline"
    >
      <div className={`${shared.sectionInner} ${styles.introWrap}`}>
        <header className={styles.intro}>
          <p className={styles.eyebrow}>{JOURNEY.eyebrow}</p>
          <h2 id="journey-headline" className={styles.headline}>
            <span>{JOURNEY.headlineLine1}</span>
            <span>{JOURNEY.headlineLine2}</span>
          </h2>
          <p className={styles.support}>{JOURNEY.support}</p>
        </header>
      </div>

      <div className={styles.canvas}>
        <div className={styles.layerBg} aria-hidden>
          <div className={styles.grid} />
          <div className={styles.ambient} />
        </div>

        <div className={styles.story}>
          <div className={styles.spine} aria-hidden />

          <ol className={styles.stages}>
            {JOURNEY.nodes.map((node, i) => {
              const reverse = i % 2 === 1;
              const isFinale = i === NODE_COUNT - 1;
              const state =
                i === active ? "active" : i < active ? "passed" : "upcoming";

              return (
                <li
                  key={node.id}
                  ref={(el) => {
                    stageRefs.current[i] = el;
                  }}
                  className={[
                    styles.stage,
                    reverse ? styles.stageReverse : "",
                    isFinale ? styles.stageFinale : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  data-state={state}
                >
                  <div className={styles.marker} aria-hidden>
                    <span className={styles.markerDot} />
                    <span className={styles.markerNum}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <Reveal className={styles.copy}>
                    <p className={styles.stageLabel}>{node.label}</p>
                    <h3 className={styles.stageTitle}>
                      <span>{node.titleLine1}</span>
                      <span>{node.titleLine2}</span>
                    </h3>
                    {i === 0 ? (
                      <p className={styles.pipeline}>
                        New enquiry <span>→</span> Trial <span>→</span> Joined
                      </p>
                    ) : null}
                    {isFinale ? (
                      <p className={styles.converge}>
                        Leads · Batches · Attendance · Invoices · Payments →
                        Insight
                      </p>
                    ) : null}
                  </Reveal>

                  <Reveal className={styles.visual} delay={80}>
                    <div className={styles.floatShot}>
                      <div className={styles.floatChrome} aria-hidden>
                        <span />
                        <span />
                        <span />
                        <em>classa · {JOURNEY.student}</em>
                      </div>
                      <Shot
                        id={node.shot as ShotId}
                        browserChrome={false}
                        ratio="16 / 10"
                        active={i <= active}
                      />
                    </div>
                  </Reveal>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      <div className={`${shared.sectionInner} ${styles.closing}`}>
        <h3 className={styles.closingTitle}>
          <span>{JOURNEY.closingHeadlineLine1}</span>
          <span>{JOURNEY.closingHeadlineLine2}</span>
        </h3>
        <p className={styles.closingSupport}>{JOURNEY.closingSupport}</p>
        <TouchButton as={Link} to="/register" variant="primary">
          {JOURNEY.closingCta}
        </TouchButton>
      </div>
    </section>
  );
}
