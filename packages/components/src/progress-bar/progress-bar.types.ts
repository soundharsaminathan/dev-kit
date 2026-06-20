import type { AriaProgressBarProps } from "@react-aria/progress";
import type { ComponentPropsWithoutRef, Ref } from "react";

export type ProgressBarProps = AriaProgressBarProps &
  ComponentPropsWithoutRef<"div"> & {
    ref?: Ref<HTMLDivElement>;
  };

export type ProgressBarTrackProps = ComponentPropsWithoutRef<"div">;
export type ProgressBarFillProps = ComponentPropsWithoutRef<"div">;
export type ProgressBarOutputProps = ComponentPropsWithoutRef<"span">;
