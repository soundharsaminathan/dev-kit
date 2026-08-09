import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import styles from "./batch-detail-skeleton.module.scss";

const METRIC_KEYS = ["m0", "m1", "m2", "m3"] as const;
const SESSION_KEYS = ["s0", "s1", "s2"] as const;
const TAB_KEYS = ["t0", "t1"] as const;
const ROW_KEYS = ["r0", "r1", "r2", "r3"] as const;

export function BatchDetailSkeleton() {
  return (
    <div
      className={styles.root}
      role="status"
      aria-busy="true"
      aria-label="Loading batch"
    >
      <section className={styles.card}>
        <div className={styles.identity}>
          <SkeletonBlock
            height="4.5rem"
            width="4.5rem"
            radius="var(--radius-xl, 1rem)"
          />
          <div className={styles.copy}>
            <div className={styles.titleRow}>
              <SkeletonBlock height="1.25rem" width="55%" />
              <SkeletonBlock
                height="1.375rem"
                width="4rem"
                radius="var(--radius-full, 999px)"
              />
            </div>
            <SkeletonBlock height="0.8125rem" width="70%" />
            <div className={styles.trainers}>
              <SkeletonBlock
                height="1.75rem"
                width="1.75rem"
                radius="var(--radius-full, 999px)"
              />
              <SkeletonBlock
                height="1.75rem"
                width="1.75rem"
                radius="var(--radius-full, 999px)"
              />
              <SkeletonBlock
                height="1.5rem"
                width="5.5rem"
                radius="var(--radius-full, 999px)"
              />
            </div>
          </div>
        </div>

        <div className={styles.fill}>
          <div className={styles.fillLabel}>
            <SkeletonBlock height="0.75rem" width="2.5rem" />
            <SkeletonBlock height="0.75rem" width="5rem" />
          </div>
          <SkeletonBlock
            height="0.5rem"
            width="100%"
            radius="var(--radius-full, 999px)"
          />
        </div>

        <div className={styles.metrics}>
          {METRIC_KEYS.map((key) => (
            <div key={key} className={styles.metric}>
              <SkeletonBlock height="0.6875rem" width="45%" />
              <SkeletonBlock height="1rem" width="30%" />
            </div>
          ))}
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.sectionHeader}>
          <SkeletonBlock height="0.8125rem" width="9rem" />
          <SkeletonBlock height="0.75rem" width="1.25rem" />
        </div>
        <div className={styles.sessionList}>
          {SESSION_KEYS.map((key) => (
            <div key={key} className={styles.sessionRow}>
              <div className={styles.sessionCopy}>
                <SkeletonBlock height="0.875rem" width="65%" />
                <SkeletonBlock height="0.75rem" width="35%" />
              </div>
              <SkeletonBlock height="1rem" width="1rem" />
            </div>
          ))}
        </div>
      </section>

      <div className={styles.tabs}>
        {TAB_KEYS.map((key) => (
          <SkeletonBlock
            key={key}
            height="2.25rem"
            width="5.5rem"
            radius="var(--radius-full, 999px)"
          />
        ))}
      </div>

      <div className={styles.roster}>
        <div className={styles.rosterSummary}>
          <SkeletonBlock
            height="1.5rem"
            width="7rem"
            radius="var(--radius-full, 999px)"
          />
          <SkeletonBlock
            height="1.5rem"
            width="4rem"
            radius="var(--radius-full, 999px)"
          />
        </div>
        <div className={styles.enrollPanel}>
          <SkeletonBlock height="2.75rem" width="100%" />
          <SkeletonBlock height="2.75rem" width="6.5rem" />
        </div>
        <div className={styles.rosterList}>
          {ROW_KEYS.map((key) => (
            <div key={key} className={styles.rosterRow}>
              <SkeletonBlock
                height="3.5rem"
                width="3.5rem"
                radius="var(--radius-lg, 0.75rem)"
              />
              <div className={styles.rosterCopy}>
                <SkeletonBlock height="1rem" width="40%" />
                <SkeletonBlock height="0.8125rem" width="60%" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
