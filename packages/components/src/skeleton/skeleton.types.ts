import type { ComponentPropsWithoutRef } from "react";

export type SkeletonAnimation = "shimmer" | "pulse" | "none";

export type SkeletonProps = ComponentPropsWithoutRef<"div"> & {
  isLoading?: boolean | undefined;
  animation?: SkeletonAnimation | undefined;
};
