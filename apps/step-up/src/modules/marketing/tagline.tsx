import { useEffect, useRef, useState } from "react";
import { TAGLINE } from "./content";
import styles from "./tagline.module.scss";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function WordText({ word }: { word: string }) {
  return Array.from(word).map((char, i) =>
    char.toLowerCase() === "f" ? (
        <span key={i} className={styles.f}>
          {char}
        </span>
    ) : (
      <span key={i}>{char}</span>
    ),
  );
}

export function Tagline({ compact = false }: { compact?: boolean }) {
  const words = TAGLINE.lines.map((line) => line.split(" "));
  const total = words.reduce((n, line) => n + line.length, 0);
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setActive(total);
      return;
    }

    const nodes = refs.current.filter(Boolean) as HTMLSpanElement[];
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const idx = nodes.indexOf(entry.target as HTMLSpanElement);
          if (idx >= 0) {
            setActive((current) => Math.max(current, idx + 1));
          }
        }
      },
      { root: null, rootMargin: "-42% 0px -42% 0px", threshold: 0 },
    );

    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, [total]);

  let index = 0;

  return (
    <section
      className={styles.section}
      data-compact={compact || undefined}
      aria-labelledby="tagline-headline"
    >
      <h2
        id="tagline-headline"
        className={styles.headline}
        aria-label={TAGLINE.lines.join(" ")}
      >
        {words.map((line, lineIdx) => (
          <span key={TAGLINE.lines[lineIdx]} className={styles.line}>
            {line.map((word) => {
              const i = index;
              index += 1;
              const on = i < active;
              return (
                <span
                  key={`${word}-${i}`}
                  ref={(el) => {
                    refs.current[i] = el;
                  }}
                  className={styles.word}
                  data-active={on || undefined}
                >
                  <WordText word={word} />
                </span>
              );
            })}
          </span>
        ))}
      </h2>
    </section>
  );
}
