import styles from "./skeleton-block.module.scss";

export function SkeletonBlock({
  height = "1rem",
  width = "100%",
  radius = "var(--radius-lg, 0.75rem)",
  className,
}: {
  height?: string | undefined;
  width?: string | undefined;
  radius?: string | undefined;
  className?: string | undefined;
}) {
  return (
    <div
      className={[styles.block, className].filter(Boolean).join(" ")}
      style={{ height, width, borderRadius: radius }}
      aria-hidden
    />
  );
}

const SKELETON_CARD_KEYS = [
  "scard-0",
  "scard-1",
  "scard-2",
  "scard-3",
  "scard-4",
  "scard-5",
  "scard-6",
  "scard-7",
  "scard-8",
  "scard-9",
];

export function SkeletonCardList({ count = 3 }: { count?: number }) {
  return (
    <div className={styles.list}>
      {SKELETON_CARD_KEYS.slice(0, count).map((key) => (
        <div key={key} className={styles.card}>
          <SkeletonBlock height="10rem" radius="var(--radius-2xl, 1.25rem)" />
          <SkeletonBlock height="1rem" width="40%" />
          <SkeletonBlock height="1.25rem" width="70%" />
          <SkeletonBlock height="0.875rem" width="55%" />
        </div>
      ))}
    </div>
  );
}

const BATCH_CARD_KEYS = [
  "batch-0",
  "batch-1",
  "batch-2",
  "batch-3",
  "batch-4",
  "batch-5",
  "batch-6",
  "batch-7",
  "batch-8",
  "batch-9",
];

export function BatchCardSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className={styles.batchList}>
      {BATCH_CARD_KEYS.slice(0, count).map((key) => (
        <div key={key} className={styles.batchRow}>
          <SkeletonBlock
            className={styles.batchMedia}
            height="auto"
            width="100%"
            radius="var(--radius-lg, 0.75rem)"
          />
          <div className={styles.batchBody}>
            <SkeletonBlock height="0.625rem" width="28%" />
            <SkeletonBlock height="2.25rem" width="92%" />
            <SkeletonBlock height="0.75rem" width="55%" />
            <SkeletonBlock height="0.75rem" width="42%" />
            <SkeletonBlock height="1.25rem" width="40%" />
            <SkeletonBlock height="0.75rem" width="70%" />
            <SkeletonBlock height="0.75rem" width="50%" />
            <SkeletonBlock height="1.5rem" width="5rem" radius="999px" />
            <SkeletonBlock
              height="2.375rem"
              width="100%"
              radius="var(--radius-lg, 0.75rem)"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

const SKELETON_ROW_KEYS = [
  { id: "srow-0", title: "58%", meta: "42%" },
  { id: "srow-1", title: "72%", meta: "36%" },
  { id: "srow-2", title: "48%", meta: "40%" },
  { id: "srow-3", title: "64%", meta: "34%" },
  { id: "srow-4", title: "54%", meta: "44%" },
  { id: "srow-5", title: "68%", meta: "38%" },
  { id: "srow-6", title: "50%", meta: "41%" },
  { id: "srow-7", title: "62%", meta: "35%" },
] as const;

export function SkeletonRowList({
  count = 4,
  label = "Loading list",
}: {
  count?: number;
  label?: string;
}) {
  return (
    <div className={styles.rowList} role="status" aria-label={label}>
      {SKELETON_ROW_KEYS.slice(0, count).map((row) => (
        <div key={row.id} className={styles.rowCard}>
          <SkeletonBlock
            className={styles.rowAvatar}
            height="2.75rem"
            width="2.75rem"
            radius="var(--radius-lg, 0.75rem)"
          />
          <div className={styles.rowBody}>
            <SkeletonBlock height="0.9375rem" width={row.title} />
            <SkeletonBlock height="0.8125rem" width={row.meta} />
          </div>
        </div>
      ))}
    </div>
  );
}
