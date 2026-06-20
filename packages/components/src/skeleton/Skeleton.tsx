import { cn } from "@dev-ui/core";
import { useRef } from "react";
import styles from "./skeleton.module.scss";
import type { SkeletonProps } from "./skeleton.types";

function Skeleton({
  className,
  children,
  isLoading,
  animation = "shimmer",
  ...props
}: SkeletonProps) {
  const ref = useRef<HTMLDivElement>(null);
  const hasChildren = children != null;
  const shouldShowSkeleton = isLoading ?? !hasChildren;
  const rootClassName = cn(
    styles.root,
    shouldShowSkeleton && !hasChildren ? styles.placeholderBlock : "",
    className,
  );

  if (!hasChildren && !shouldShowSkeleton) {
    return null;
  }

  return (
    <div
      ref={ref}
      data-skeleton-loading={shouldShowSkeleton ? "true" : undefined}
      data-animation={shouldShowSkeleton ? animation : undefined}
      aria-busy={shouldShowSkeleton ? true : undefined}
      inert={shouldShowSkeleton ? true : undefined}
      className={rootClassName}
      {...props}
    >
      {children}
    </div>
  );
}

export type { SkeletonAnimation, SkeletonProps } from "./skeleton.types";
export { Skeleton };
