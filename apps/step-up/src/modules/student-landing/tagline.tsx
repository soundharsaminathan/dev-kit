import { useEffect, useRef, useState } from "react";
import shared from "@/modules/marketing/marketing.module.scss";
import { Reveal } from "@/modules/marketing/reveal";
import { STUDENT_TAGLINE } from "./content";
import styles from "./tagline.module.scss";

function Word({ text, active }: { text: string; active: boolean }) {
  return (
    <span className={styles.word} data-active={active || undefined}>
      {text}
    </span>
  );
}

function wordKeys(words: string[]) {
  const seen = new Map<string, number>();
  return words.map((word) => {
    const next = (seen.get(word) ?? 0) + 1;
    seen.set(word, next);
    return `${word}-${next}`;
  });
}

export function WordReveal({ line1, line2 }: { line1: string; line2: string }) {
  const ref = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(0);
  const line1Words = line1.split(" ").filter(Boolean);
  const line2Words = line2.split(" ").filter(Boolean);
  const line1Keys = wordKeys(line1Words);
  const line2Keys = wordKeys(line2Words);
  const wordCount = line1Words.length + line2Words.length;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setProgress(wordCount);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        const ratio = entry.intersectionRatio;
        setProgress(Math.ceil(ratio * wordCount));
      },
      { threshold: Array.from({ length: 21 }, (_, i) => i / 20) },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [wordCount]);

  return (
    <section
      ref={ref}
      className={`${shared.section} ${styles.section}`}
      aria-label="Tagline"
    >
      <div className={shared.sectionInner}>
        <Reveal>
          <p className={styles.line}>
            {line1Words.map((word, offset) => (
              <Word
                key={line1Keys[offset] ?? word}
                text={word}
                active={offset < progress}
              />
            ))}
          </p>
          <p className={styles.line}>
            {line2Words.map((word, offset) => (
              <Word
                key={line2Keys[offset] ?? word}
                text={word}
                active={line1Words.length + offset < progress}
              />
            ))}
          </p>
        </Reveal>
      </div>
    </section>
  );
}

export function StudentTagline() {
  return (
    <WordReveal line1={STUDENT_TAGLINE.line1} line2={STUDENT_TAGLINE.line2} />
  );
}
