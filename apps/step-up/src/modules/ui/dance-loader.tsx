import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import styles from "./dance-loader.module.scss";

const LOADER_GIF = "/loader.gif";

const LOADING_PHRASES = [
  "Stretching it out…",
  "Finding the groove…",
  "Spotting the turn…",
  "Marking the combo…",
  "Feeling the rhythm…",
  "Stepping into it…",
] as const;

const CYCLE_MS = 1600;
const CASCADE_STAGGER = 0.025;
const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const ROLL_BLUR = "blur(6px)";

const SPRING_SWAP = {
  type: "spring" as const,
  stiffness: 460,
  damping: 30,
  mass: 0.55,
};

const CASCADE_LETTER_VARIANTS: Variants = {
  initial: { opacity: 0, y: "105%", filter: ROLL_BLUR },
  animate: (delay: number = 0) => ({
    opacity: 1,
    y: "0%",
    filter: "blur(0px)",
    transition: { ...SPRING_SWAP, delay },
  }),
  exit: (delay: number = 0) => ({
    opacity: 0,
    y: "-105%",
    filter: ROLL_BLUR,
    transition: { duration: 0.16, ease: EASE_OUT, delay: delay * 0.5 },
  }),
};

function phraseIndexAt(count: number, now = Date.now()) {
  return Math.floor(now / CYCLE_MS) % count;
}

type DanceLoaderProps = {
  label?: string;
  caption?: string;
  phrases?: readonly string[];
};

function CascadingCaption({ text }: { text: string }) {
  const reducedMotion = useReducedMotion();
  const skipEnterRef = useRef(true);

  useLayoutEffect(() => {
    skipEnterRef.current = false;
  }, []);

  if (reducedMotion) {
    return <p className={styles.caption}>{text}</p>;
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
            initial={skipEnterRef.current ? false : "initial"}
            animate="animate"
            exit="exit"
            aria-hidden
          >
            {text.split("").map((char, i) => (
              <motion.span
                // biome-ignore lint/suspicious/noArrayIndexKey: stable glyph slots in phrase
                key={i}
                custom={i * CASCADE_STAGGER}
                variants={CASCADE_LETTER_VARIANTS}
                className={styles.letter}
              >
                {char}
              </motion.span>
            ))}
          </motion.span>
        </AnimatePresence>
      </span>
    </p>
  );
}

export function DanceLoader({
  label = "Loading",
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
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      {reducedMotion ? null : (
        <img className={styles.dancer} src={LOADER_GIF} alt="" aria-hidden />
      )}
      <CascadingCaption text={currentPhrase} />
    </div>
  );
}
