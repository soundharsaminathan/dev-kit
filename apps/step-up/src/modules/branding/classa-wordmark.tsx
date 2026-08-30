import type { CSSProperties } from "react";
import styles from "./classa-wordmark.module.scss";

export type WordmarkVariant =
  | "default"
  | "split"
  | "italic-a"
  | "serif"
  | "mono"
  | "stencil"
  | "gradient";

type ClassaWordmarkProps = {
  variant?: WordmarkVariant;
  className?: string;
  style?: CSSProperties;
};

/**
 * Styled classa brand wordmark.
 *
 * Variants:
 * - `default` — clean sans-serif
 * - `split` — "class" bold + "a" light
 * - `italic-a` — upright "class" + italic "a"
 * - `serif` — elegant serif treatment
 * - `mono` — monospace tech feel
 * - `stencil` — stencil cutout style
 * - `gradient` — gradient text fill
 */
export function ClassaWordmark({
  variant = "default",
  className,
  style,
}: ClassaWordmarkProps) {
  const rootClass = [styles.wordmark, styles[variant], className]
    .filter(Boolean)
    .join(" ");

  if (variant === "split" || variant === "italic-a") {
    return (
      <span className={rootClass} style={style}>
        <span className={styles.prefix}>class</span>
        <span className={styles.suffix}>a</span>
      </span>
    );
  }

  if (variant === "stencil") {
    return (
      <span className={rootClass} style={style}>
        <span className={styles.letter}>c</span>
        <span className={styles.letter}>l</span>
        <span className={styles.letter}>a</span>
        <span className={styles.letter}>s</span>
        <span className={styles.letter}>s</span>
        <span className={styles.letter}>a</span>
      </span>
    );
  }

  return (
    <span className={rootClass} style={style}>
      classa
    </span>
  );
}
