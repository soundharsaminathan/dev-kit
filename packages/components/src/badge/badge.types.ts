import type { ComponentPropsWithoutRef } from "react";

export type BadgeAppearance = "solid" | "subtle";

export type BadgeVariant =
  | "neutral"
  | "accent"
  | "danger"
  | "success"
  | "warning"
  | "info";

export type BadgeSize = "sm" | "md" | "lg";

export type BadgeProps = ComponentPropsWithoutRef<"span"> & {
  appearance?: BadgeAppearance | undefined;
  variant?: BadgeVariant | undefined;
  size?: BadgeSize | undefined;
};
