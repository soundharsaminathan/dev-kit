import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import styles from "./dance-loader.module.scss";

const LOADER_GIF = "/loader.gif";

type LoadingPhrase = {
  lead: string;
  keyword: string;
};

const LOADING_PHRASES: readonly LoadingPhrase[] = [
  { lead: "Stretching it ", keyword: "out…" },
  { lead: "Finding the ", keyword: "groove…" },
  { lead: "Spotting the ", keyword: "turn…" },
  { lead: "Marking the ", keyword: "combo…" },
  { lead: "Feeling the ", keyword: "rhythm…" },
  { lead: "Stepping into ", keyword: "it…" },
];

const CYCLE_MS = 2200;
const CASCADE_STAGGER = 0.025;
const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const ROLL_BLUR = "blur(6px)";

const SPRING_SWAP = {
  type: "spring" as const,
  stiffness: 460,
  damping: 30,
  mass: 0.55,
};

const CASCADE_CONTAINER_VARIANTS: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: CASCADE_STAGGER },
  },
  exit: {
    transition: {
      staggerChildren: CASCADE_STAGGER * 0.5,
      staggerDirection: -1,
      when: "afterChildren",
    },
  },
};

const CASCADE_LETTER_VARIANTS: Variants = {
  initial: { opacity: 0, y: "105%", filter: ROLL_BLUR },
  animate: {
    opacity: 1,
    y: "0%",
    filter: "blur(0px)",
    transition: SPRING_SWAP,
  },
  exit: {
    opacity: 0,
    y: "-105%",
    filter: ROLL_BLUR,
    transition: { duration: 0.16, ease: EASE_OUT },
  },
};

function phraseIndexAt(count: number, now = Date.now()) {
  return Math.floor(now / CYCLE_MS) % count;
}

function phraseText(phrase: LoadingPhrase | string) {
  if (typeof phrase === "string") return phrase;
  return `${phrase.lead}${phrase.keyword}`;
}

function keywordStart(phrase: LoadingPhrase | string) {
  if (typeof phrase === "string") {
    const match = phrase.match(/^(.*\s)(\S+)$/);
    return match ? match[1]!.length : 0;
  }
  return phrase.lead.length;
}

type DanceLoaderProps = {
  label?: string;
  caption?: string;
  phrases?: readonly (LoadingPhrase | string)[];
};

function CascadingCaption({ phrase }: { phrase: LoadingPhrase | string }) {
  const reducedMotion = useReducedMotion();
  const skipEnterRef = useRef(true);
  const text = phraseText(phrase);
  const splitAt = keywordStart(phrase);

  useLayoutEffect(() => {
    skipEnterRef.current = false;
  }, []);

  if (reducedMotion) {
    return (
      <p className={styles.caption}>
        {text.slice(0, splitAt)}
        <span className={styles.emphasis}>{text.slice(splitAt)}</span>
      </p>
    );
  }

  return (
    <p className={styles.caption} aria-hidden>
      <span className={styles.cascade}>
        <span className={styles.measure} aria-hidden>
          {text}
        </span>
        <AnimatePresence initial={false}>
          <motion.span
            key={text}
            className={styles.cascadeLayer}
            variants={CASCADE_CONTAINER_VARIANTS}
            initial={skipEnterRef.current ? false : "initial"}
            animate="animate"
            exit="exit"
            aria-hidden
          >
            {text.split("").map((char, i) => {
              const isSpace = /\s/.test(char);
              return (
                <motion.span
                  // biome-ignore lint/suspicious/noArrayIndexKey: stable glyph slots in phrase
                  key={i}
                  variants={CASCADE_LETTER_VARIANTS}
                  className={
                    isSpace
                      ? styles.letterSpace
                      : i >= splitAt
                        ? styles.letterEmphasis
                        : styles.letter
                  }
                >
                  {isSpace ? "\u00A0" : char}
                </motion.span>
              );
            })}
          </motion.span>
        </AnimatePresence>
      </span>
    </p>
  );
}

export function DanceLoader({
  label = "Loading app",
  caption,
  phrases = LOADING_PHRASES,
}: DanceLoaderProps) {
  const reducedMotion = useReducedMotion();
  const activePhrases =
    caption != null
      ? [caption]
      : phrases.length > 0
        ? phrases
        : LOADING_PHRASES;
  const phraseCount = activePhrases.length;
  const [phraseIndex, setPhraseIndex] = useState(() =>
    phraseIndexAt(phraseCount),
  );

  const currentPhrase = activePhrases[phraseIndex % phraseCount]!;

  useEffect(() => {
    if (phraseCount <= 1 || reducedMotion) return;
    const id = window.setInterval(() => {
      setPhraseIndex(phraseIndexAt(phraseCount));
    }, 100);
    return () => window.clearInterval(id);
  }, [phraseCount, reducedMotion]);

  return (
    <div
      className={styles.root}
      data-boot-loader=""
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      {reducedMotion ? null : (
        <img className={styles.dancer} src={LOADER_GIF} alt="" aria-hidden />
      )}
      <CascadingCaption phrase={currentPhrase} />
    </div>
  );
}
