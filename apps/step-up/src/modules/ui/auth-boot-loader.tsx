import styles from "./dance-loader.module.scss";

type AuthBootLoaderProps = {
  label?: string;
  caption?: string;
};

/**
 * Auth-gate loader without motion/react or the 88KB GIF — CSS mark keeps the
 * critical path light while HTML #boot-splash covers the pre-JS window.
 */
export function AuthBootLoader({
  label = "Loading app",
  caption = "Finding the groove…",
}: AuthBootLoaderProps) {
  return (
    <div
      className={styles.root}
      data-boot-loader=""
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className={styles.mark} aria-hidden>
        <span className={styles.markPulse} />
        <span className={styles.markCore} />
      </div>
      <p className={styles.caption}>{caption}</p>
    </div>
  );
}
