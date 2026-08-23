import { Link } from "@tanstack/react-router";
import { useImportJob } from "@/modules/import/import-job-provider";
import styles from "./import-status-banner.module.scss";

export function ImportStatusBanner() {
  const { job, batchName, percent, isActive, isComplete, isFailed } =
    useImportJob();

  if (!job || (!isActive && !isComplete && !isFailed)) {
    return null;
  }

  const label = batchName?.trim() || "Studio import";

  return (
    <div className={styles.stack} role="status">
      <div
        className={[
          styles.banner,
          isComplete ? styles.complete : "",
          isFailed ? styles.failed : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className={styles.copy}>
          <p className={styles.title}>
            {isComplete
              ? `${label} imported`
              : isFailed
                ? `${label} import failed`
                : `Importing ${label}`}
          </p>
          <p className={styles.meta}>
            {isComplete
              ? "Studio data is ready."
              : isFailed
                ? job.error ?? "Something went wrong while importing."
                : `${percent}% complete`}
          </p>
        </div>
        {isActive ? (
          <Link to="/app/import" className={styles.action}>
            View
          </Link>
        ) : null}
      </div>
      {isActive ? (
        <div className={styles.progress} aria-hidden>
          <span
            className={styles.progressFill}
            style={{ width: `${percent}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
