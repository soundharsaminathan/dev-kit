import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import styles from "./leads.module.scss";

const LEAD_CARD_KEYS = [
  {
    id: "lead-card-0",
    name: "58%",
    meta: "42%",
    trial: "38%",
    when: "55%",
    button: "7.5rem",
  },
  {
    id: "lead-card-1",
    name: "72%",
    meta: "48%",
    trial: "30%",
    when: "62%",
    button: "6.75rem",
  },
  {
    id: "lead-card-2",
    name: "48%",
    meta: "40%",
    trial: "42%",
    when: "50%",
    button: "8rem",
  },
  {
    id: "lead-card-3",
    name: "64%",
    meta: "36%",
    trial: "34%",
    when: "58%",
    button: "7rem",
  },
  {
    id: "lead-card-4",
    name: "54%",
    meta: "44%",
    trial: "40%",
    when: "52%",
    button: "6.5rem",
  },
  {
    id: "lead-card-5",
    name: "68%",
    meta: "38%",
    trial: "32%",
    when: "60%",
    button: "7.75rem",
  },
  {
    id: "lead-card-6",
    name: "50%",
    meta: "41%",
    trial: "36%",
    when: "54%",
    button: "6.75rem",
  },
  {
    id: "lead-card-7",
    name: "62%",
    meta: "35%",
    trial: "44%",
    when: "48%",
    button: "7.25rem",
  },
] as const;

export function LeadCardSkeletonList({
  count = 4,
  label = "Loading leads",
}: {
  count?: number;
  label?: string;
}) {
  return (
    <div className={styles.skeletonList} role="status" aria-label={label}>
      {LEAD_CARD_KEYS.slice(0, count).map((key) => (
        <div key={key.id} className={styles.card} aria-hidden>
          <div className={styles.topRow}>
            <SkeletonBlock
              className={styles.skeletonAvatar}
              height="2.75rem"
              width="2.75rem"
              radius="var(--radius-lg, 0.75rem)"
            />
            <div className={styles.body}>
              <div className={styles.nameRow}>
                <SkeletonBlock height="0.9375rem" width={key.name} />
                <SkeletonBlock
                  height="0.8125rem"
                  width="2.5rem"
                  radius="var(--radius-full, 999px)"
                />
              </div>
              <SkeletonBlock height="0.8125rem" width={key.meta} />
              <SkeletonBlock
                height="1.125rem"
                width="4.5rem"
                radius="var(--radius-full, 999px)"
              />
            </div>
          </div>
          <div className={styles.trialBlock}>
            <div className={styles.trialInfo}>
              <SkeletonBlock height="0.75rem" width={key.trial} />
              <SkeletonBlock height="0.8125rem" width={key.when} />
            </div>
            <SkeletonBlock
              height="2rem"
              width={key.button}
              radius="var(--radius-lg, 0.75rem)"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
