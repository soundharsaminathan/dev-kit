import type { AriaMeterProps } from "@react-aria/meter";
import type { ComponentPropsWithoutRef, Ref } from "react";

export type MeterProps = AriaMeterProps &
  ComponentPropsWithoutRef<"div"> & {
    ref?: Ref<HTMLDivElement>;
  };

export type MeterTrackProps = ComponentPropsWithoutRef<"div">;
export type MeterFillProps = ComponentPropsWithoutRef<"div">;
export type MeterOutputProps = ComponentPropsWithoutRef<"span">;
