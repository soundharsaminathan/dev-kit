import { Alert, AlertDescription, AlertTitle } from "@dev-ui/components/alert";
import { Empty, EmptyDescription, EmptyTitle } from "@dev-ui/components/empty";
import { Loader } from "@dev-ui/components/loader";
import { Skeleton } from "@dev-ui/components/skeleton";
import type { ReactNode } from "react";
import { ApiError } from "@/lib/api";
import styles from "./api-state.module.scss";

type ApiStateProps<T> = {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  data: T | undefined;
  emptyTitle?: string;
  emptyDescription?: string;
  variant?: "default" | "compact";
  allowEmpty?: boolean;
  children: (data: T) => ReactNode;
};

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 0 || error.message.includes("Failed to fetch")) {
      return "We could not reach the Step Up API. Start the API server and try again.";
    }
    return error.message;
  }

  if (error instanceof Error) {
    if (error.message.includes("Failed to fetch")) {
      return "We could not reach the Step Up API. Start the API server and try again.";
    }
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export function ApiState<T>({
  isLoading,
  isError,
  error,
  data,
  emptyTitle = "Nothing here yet",
  emptyDescription = "There is no data to show right now.",
  variant = "default",
  allowEmpty = false,
  children,
}: ApiStateProps<T>) {
  if (isLoading) {
    if (variant === "compact") {
      return (
        <div className={styles.compactLoading}>
          <Skeleton className={styles.compactSkeleton} aria-label="Loading" />
        </div>
      );
    }

    return (
      <div className={styles.loading}>
        <Loader aria-label="Loading" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="danger">
        <AlertTitle>Unable to load</AlertTitle>
        <AlertDescription>{getErrorMessage(error)}</AlertDescription>
      </Alert>
    );
  }

  if (data === undefined || data === null) {
    return (
      <Empty>
        <EmptyTitle>{emptyTitle}</EmptyTitle>
        <EmptyDescription>{emptyDescription}</EmptyDescription>
      </Empty>
    );
  }

  if (!allowEmpty && Array.isArray(data) && data.length === 0) {
    return (
      <Empty>
        <EmptyTitle>{emptyTitle}</EmptyTitle>
        <EmptyDescription>{emptyDescription}</EmptyDescription>
      </Empty>
    );
  }

  return <>{children(data)}</>;
}
