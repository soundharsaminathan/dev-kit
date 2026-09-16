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

export function StudentTagline() {
  const ref = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(0);
  const words = [
    ...STUDENT_TAGLINE.line1.split(" "),
    ...STUDENT_TAGLINE.line2.split(" "),
  ];

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setProgress(words.length);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        const ratio = entry.intersectionRatio;
        setProgress(Math.ceil(ratio * words.length));
      },
      { threshold: Array.from({ length: 21 }, (_, i) => i / 20) },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [words.length]);

  const split = STUDENT_TAGLINE.line1.split(" ").length;

  return (
    <section
      ref={ref}
      className={`${shared.section} ${styles.section}`}
      aria-label="Tagline"
    >
      <div className={shared.sectionInner}>
        <Reveal>
          <p className={styles.line}>
            {words.slice(0, split).map((word, offset) => (
              <Word key={`a-${word}`} text={word} active={offset < progress} />
            ))}
          </p>
          <p className={styles.line}>
            {words.slice(split).map((word, offset) => (
              <Word
                key={`b-${word}`}
                text={word}
                active={split + offset < progress}
              />
            ))}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
