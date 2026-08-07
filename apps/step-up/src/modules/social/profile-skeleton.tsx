import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import styles from "./profile-skeleton.module.scss";

const STAT_KEYS = ["posts", "followers", "following"] as const;
const TAB_KEYS = ["batches", "posts", "contact"] as const;
const BATCH_KEYS = ["b0", "b1", "b2"] as const;
const CHIP_KEYS = ["c0", "c1", "c2"] as const;

export function ProfileSkeleton() {
  return (
    <div
      className={styles.root}
      role="status"
      aria-busy="true"
      aria-label="Loading profile"
    >
      <header className={styles.header}>
        <SkeletonBlock
          className={styles.avatar}
          height="5.5rem"
          width="5.5rem"
          radius="999px"
        />

        <div className={styles.aside}>
          <SkeletonBlock
            className={styles.username}
            height="1.5rem"
            width="12rem"
          />

          <div className={styles.actions}>
            <SkeletonBlock
              height="2.75rem"
              width="100%"
              radius="var(--radius-xl, 1rem)"
            />
            <SkeletonBlock
              height="2.75rem"
              width="100%"
              radius="var(--radius-xl, 1rem)"
            />
          </div>

          <dl className={styles.stats}>
            {STAT_KEYS.map((key) => (
              <div key={key} className={styles.stat}>
                <SkeletonBlock height="1.125rem" width="2.25rem" />
                <SkeletonBlock height="0.75rem" width="3rem" />
              </div>
            ))}
          </dl>

          <div className={styles.bioBlock}>
            <SkeletonBlock height="0.95rem" width="42%" />
            <SkeletonBlock height="0.875rem" width="88%" />
            <SkeletonBlock height="0.875rem" width="64%" />
            <div className={styles.chips}>
              {CHIP_KEYS.map((key) => (
                <SkeletonBlock
                  key={key}
                  height="1.5rem"
                  width="4.5rem"
                  radius="999px"
                />
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className={styles.tabs}>
        <div className={styles.tabList}>
          {TAB_KEYS.map((key) => (
            <SkeletonBlock
              key={key}
              height="0.875rem"
              width="4.5rem"
              radius="var(--radius-md, 0.5rem)"
            />
          ))}
        </div>
        <div className={styles.batches}>
          {BATCH_KEYS.map((key) => (
            <SkeletonBlock
              key={key}
              height="7.5rem"
              width="100%"
              radius="var(--radius-xl, 1rem)"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
