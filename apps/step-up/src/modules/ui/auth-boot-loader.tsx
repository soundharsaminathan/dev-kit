import styles from "./dance-loader.module.scss";

type AuthBootLoaderProps = {
  label?: string;
  caption?: string;
  /** Match /me banner title so React auth-gate does not shrink the early LCP. */
  meGreeting?: boolean;
};

/**
 * Auth-gate loader without motion/react or the 88KB GIF — CSS mark keeps the
 * critical path light while HTML #boot-splash covers the pre-JS window.
 */
export function AuthBootLoader({
  label = "Loading app",
  caption = "Finding the groove…",
  meGreeting = false,
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
      <p
        className={styles.caption}
        data-me-greeting={meGreeting ? "" : undefined}
      >
        {caption}
      </p>
    </div>
  );
}
