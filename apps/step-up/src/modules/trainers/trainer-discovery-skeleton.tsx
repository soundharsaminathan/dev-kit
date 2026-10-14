import styles from "./trainer-discovery.module.scss";

const AVATAR_KEYS = ["a0", "a1", "a2", "a3", "a4"] as const;
const CHIP_KEYS = ["c0", "c1", "c2"] as const;
const ACTION_KEYS = ["x0", "x1"] as const;
const SEG_KEYS = ["s0", "s1", "s2", "s3"] as const;

export function TrainerDiscoverySkeleton() {
  return (
    <div
      className={styles.skeletonRoot}
      role="status"
      aria-busy="true"
      aria-label="Loading instructors"
    >
      <div className={styles.skeletonPhoto} aria-hidden />
      <div className={styles.skeletonGradient} aria-hidden />

      <div className={styles.skeletonChrome}>
        <header className={styles.skeletonTopNav}>
          <span className={styles.skeletonGlass} />
          <div className={styles.skeletonProgress}>
            {SEG_KEYS.map((key) => (
              <span key={key} className={styles.skeletonSeg} />
            ))}
          </div>
          <span className={styles.skeletonGlass} />
        </header>

        <div className={styles.skeletonActions}>
          {ACTION_KEYS.map((key) => (
            <span key={key} className={styles.skeletonAction} />
          ))}
        </div>

        <div className={styles.skeletonBody}>
          <span className={styles.skeletonName} />
          <span className={styles.skeletonLine} data-width="md" />
          <span className={styles.skeletonLine} data-width="lg" />
          <div className={styles.skeletonChips}>
            {CHIP_KEYS.map((key) => (
              <span key={key} className={styles.skeletonChip} />
            ))}
          </div>
        </div>

        <footer className={styles.skeletonFooter}>
          <div className={styles.skeletonCarousel}>
            {AVATAR_KEYS.map((key, index) => (
              <span
                key={key}
                className={styles.skeletonAvatar}
                data-active={index === 0 ? "true" : undefined}
              />
            ))}
          </div>
          <span className={styles.skeletonCta} />
        </footer>
      </div>
    </div>
  );
}
