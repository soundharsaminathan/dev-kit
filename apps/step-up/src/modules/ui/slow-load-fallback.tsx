import { BRAND_ICON_SRC, BRAND_NAME } from "@/lib/brand";
import styles from "./slow-load-fallback.module.scss";

type SlowLoadFallbackProps = {
  onRefresh?: () => void;
};

export function SlowLoadFallback({ onRefresh }: SlowLoadFallbackProps) {
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
      return;
    }
    window.location.reload();
  };

  return (
    <div
      className={styles.root}
      data-boot-loader=""
      data-slow-load=""
      role="status"
      aria-live="polite"
      aria-label="This page is taking too long to load"
    >
      <div className={styles.content}>
        <img
          className={styles.mascot}
          src={BRAND_ICON_SRC}
          alt=""
          aria-hidden
        />
        <h1 className={styles.title}>This page is taking too long to load.</h1>
        <p className={styles.body}>
          Sorry about that. Please try refreshing and contact us if the problem
          persists.
        </p>
        <nav className={styles.links} aria-label="Helpful links">
          <button type="button" className={styles.link} onClick={handleRefresh}>
            Refresh
          </button>
          <span className={styles.sep} aria-hidden>
            —
          </span>
          <a className={styles.link} href="/login">
            Sign in
          </a>
          <span className={styles.sep} aria-hidden>
            —
          </span>
          <a className={styles.link} href="/">
            Home
          </a>
        </nav>
        <img
          className={styles.brandMark}
          src={BRAND_ICON_SRC}
          alt={BRAND_NAME}
        />
      </div>
    </div>
  );
}
