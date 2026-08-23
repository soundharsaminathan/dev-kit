import { Link } from "@tanstack/react-router";
import { useImportJob } from "@/modules/import/import-job-provider";
import {
  StatusBanner,
  statusBannerActionClassName,
  StatusBannerStack,
} from "@/modules/ui/status-banner";

export function ImportStatusBanner() {
  const { job, batchName, percent, isActive, isComplete, isFailed, kind } =
    useImportJob();

  if (!job || (!isActive && !isComplete && !isFailed)) {
    return null;
  }

  const label =
    batchName?.trim() || (kind === "students" ? "Students" : "Studio import");
  const viewTo = kind === "students" ? "/app/students/import" : "/app/import";

  const title = isComplete
    ? `${label} imported`
    : isFailed
      ? `${label} import failed`
      : `Importing ${label}`;

  const meta = isComplete
    ? kind === "students"
      ? "Students are ready."
      : "Studio data is ready."
    : isFailed
      ? (job.error ?? "Something went wrong while importing.")
      : `${percent}% complete`;

  const tone = isComplete ? "success" : isFailed ? "danger" : "warning";

  return (
    <StatusBannerStack zIndex={39}>
      <StatusBanner
        tone={tone}
        title={title}
        meta={meta}
        progress={isActive ? percent : null}
        action={
          isActive ? (
            <Link to={viewTo} className={statusBannerActionClassName}>
              View
            </Link>
          ) : null
        }
      />
    </StatusBannerStack>
  );
}
