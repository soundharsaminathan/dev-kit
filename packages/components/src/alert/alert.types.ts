import type { ComponentPropsWithoutRef } from "react";

export type AlertVariant =
  | "neutral"
  | "danger"
  | "warning"
  | "info"
  | "success";

export type AlertProps = ComponentPropsWithoutRef<"div"> & {
  variant?: AlertVariant | undefined;
};

export type AlertTitleProps = ComponentPropsWithoutRef<"div">;
export type AlertDescriptionProps = ComponentPropsWithoutRef<"div">;
export type AlertActionProps = ComponentPropsWithoutRef<"div">;
