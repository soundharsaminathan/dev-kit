import styles from "./dance-loader.module.scss";

type AuthBootLoaderProps = {
  label?: string;
  caption?: string;
};

/**
 * Auth-gate loader without motion/react — keeps the critical path free of
 * animation libraries while HTML #boot-splash covers the pre-JS window.
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
      <img className={styles.dancer} src="/loader.gif" alt="" aria-hidden />
      <p className={styles.caption}>{caption}</p>
    </div>
  );
}
