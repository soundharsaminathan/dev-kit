import { IMPORT_SEGMENT_COUNT } from "./import-types";
import styles from "./import-workspace.module.scss";

type ImportSegmentedProgressProps = {
  percent: number;
  completedCount: number;
  totalEntities: number;
  accent?: boolean;
};

export function ImportSegmentedProgress({
  percent,
  completedCount,
  totalEntities,
  accent = true,
}: ImportSegmentedProgressProps) {
  const filledSegments = Math.round((percent / 100) * IMPORT_SEGMENT_COUNT);

  return (
    <div className={styles.progressBlock}>
      <div
        className={styles.segmentBar}
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Import ${percent}% complete`}
      >
        {Array.from({ length: IMPORT_SEGMENT_COUNT }, (_, index) => (
          <span
            key={index}
            className={styles.segment}
            data-filled={index < filledSegments ? "true" : undefined}
            data-accent={accent ? "true" : undefined}
          />
        ))}
      </div>
      <div className={styles.progressMeta}>
        <span
          className={styles.progressPercent}
          data-accent={accent ? "true" : undefined}
        >
          {percent}% Completed
        </span>
        <span className={styles.progressCount}>
          {completedCount} of {totalEntities} completed
        </span>
      </div>
    </div>
  );
}