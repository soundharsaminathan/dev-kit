import { useEffect, useLayoutEffect, useRef, useState } from "react";
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

const PHRASES = TAGLINE.phrases;
const LABEL = PHRASES.map(
  (phrase) => `${phrase.lead} ${phrase.tail.join(" ")}`,
).join(" ");
const TOTAL = PHRASES.reduce((n, phrase) => n + 1 + phrase.tail.length, 0);

export function Tagline({
  compact = false,
  inline = false,
}: { compact?: boolean; inline?: boolean }) {
  const [active, setActive] = useState(0);
  const [stack, setStack] = useState(true);
  const refs = useRef<(HTMLSpanElement | null)[]>([]);
  const headRef = useRef<HTMLHeadingElement>(null);
  const sizerRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const head = headRef.current;
    const sizer = sizerRef.current;
    if (!head || !sizer) return;

    const update = () => {
      setStack(sizer.offsetWidth > head.clientWidth + 1);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(head);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setActive(TOTAL);
      return;
    }

    if (inline) {
      let i = 0;
      const step = () => {
        i += 1;
        setActive(i);
        if (i < TOTAL) setTimeout(step, 120);
      };
      const id = setTimeout(step, 300);
      return () => clearTimeout(id);
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
  }, [inline]);

  let index = 0;

  const renderWord = (word: string) => {
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
  };

  const Wrapper = inline ? "div" : "section";

  return (
    <Wrapper
      className={styles.section}
      data-compact={compact || undefined}
      aria-labelledby={inline ? undefined : "tagline-headline"}
    >
      <h2
        ref={headRef}
        id={inline ? undefined : "tagline-headline"}
        className={styles.headline}
        data-stack={stack || undefined}
        aria-label={LABEL}
      >
        <span ref={sizerRef} className={styles.sizer} aria-hidden>
          {PHRASES.map((phrase) => (
            <span key={`sizer-${phrase.lead}`} className={styles.sizerCell}>
              <span className={styles.word}>
                <WordText word={phrase.lead} />
              </span>
              <span className={styles.chunk}>
                {phrase.tail.map((word) => (
                  <span key={word} className={styles.word}>
                    <WordText word={word} />
                  </span>
                ))}
              </span>
            </span>
          ))}
        </span>
        {PHRASES.map((phrase) => (
          <span key={phrase.lead} className={styles.phrase}>
            {renderWord(phrase.lead)}
            <span className={styles.chunk}>
              {phrase.tail.map((word) => renderWord(word))}
            </span>
          </span>
        ))}
      </h2>
    </Wrapper>
  );
}
