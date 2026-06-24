import type { AriaToolbarProps } from "@react-aria/toolbar";
import type { ComponentPropsWithoutRef, Ref } from "react";

export type ToolbarProps = AriaToolbarProps &
  ComponentPropsWithoutRef<"div"> & {
    ref?: Ref<HTMLDivElement>;
  };
