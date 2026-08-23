import { useEffect, useState } from "react";

const PREFIX = "Search by ";
const SUFFIX = "...";
export const STUDENT_SEARCH_PLACEHOLDER_WORDS = [
  "name",
  "email",
  "mobile number",
] as const;

/** Static fallback for reduced motion. */
export const STUDENT_SEARCH_PLACEHOLDER_STATIC =
  "Search by name, email, or mobile number";

type Phase = "typing" | "holding" | "deleting";

type UseStudentSearchPlaceholderOptions = {
  /** Pause the loop when false (e.g. field has a value). Default true. */
  enabled?: boolean;
  typeMs?: number;
  deleteMs?: number;
  holdMs?: number;
};

/**
 * Cycles "Search by name..." → email → mobile number, typing/deleting
 * the rotating word character by character.
 */
export function useStudentSearchPlaceholder(
  options: UseStudentSearchPlaceholderOptions = {},
) {
  const {
    enabled = true,
    typeMs = 70,
    deleteMs = 45,
    holdMs = 1600,
  } = options;

  const [wordIndex, setWordIndex] = useState(0);
  const [charCount, setCharCount] = useState(
    STUDENT_SEARCH_PLACEHOLDER_WORDS[0].length,
  );
  const [phase, setPhase] = useState<Phase>("holding");
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduceMotion(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!enabled || reduceMotion) return;

    const word = STUDENT_SEARCH_PLACEHOLDER_WORDS[wordIndex];
    let delay = typeMs;

    if (phase === "holding") {
      delay = holdMs;
    } else if (phase === "deleting") {
      delay = deleteMs;
    }

    const timer = window.setTimeout(() => {
      if (phase === "holding") {
        setPhase("deleting");
        return;
      }

      if (phase === "deleting") {
        if (charCount > 0) {
          setCharCount((count) => count - 1);
          return;
        }
        const nextIndex =
          (wordIndex + 1) % STUDENT_SEARCH_PLACEHOLDER_WORDS.length;
        setWordIndex(nextIndex);
        setPhase("typing");
        return;
      }

      // typing
      if (charCount < word.length) {
        setCharCount((count) => count + 1);
        return;
      }
      setPhase("holding");
    }, delay);

    return () => window.clearTimeout(timer);
  }, [
    enabled,
    reduceMotion,
    phase,
    charCount,
    wordIndex,
    typeMs,
    deleteMs,
    holdMs,
  ]);

  if (reduceMotion) {
    return STUDENT_SEARCH_PLACEHOLDER_STATIC;
  }

  const word = STUDENT_SEARCH_PLACEHOLDER_WORDS[wordIndex];
  return `${PREFIX}${word.slice(0, charCount)}${SUFFIX}`;
}
