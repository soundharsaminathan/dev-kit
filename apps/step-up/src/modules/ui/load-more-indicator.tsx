import { Loader } from "@dev-ui/components/loader";
import type { Ref } from "react";
import styles from "./load-more-indicator.module.scss";

type LoadMoreIndicatorProps = {
  ref: Ref<HTMLDivElement>;
  isLoading: boolean;
  label?: string;
  className?: string;
  testId?: string;
};

export function LoadMoreIndicator({
  ref,
  isLoading,
  label = "Loading more",
  className,
  testId,
}: LoadMoreIndicatorProps) {
  return (
    <div
      ref={ref}
      className={[
        styles.root,
        isLoading ? styles.loading : undefined,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      data-testid={testId}
      role="status"
      aria-live="polite"
      aria-label={isLoading ? label : undefined}
    >
      {isLoading ? (
        <span className={styles.pill}>
          <Loader aria-label="Loading more" />
          <span className={styles.text}>{label}…</span>
        </span>
      ) : null}
    </div>
  );
}
