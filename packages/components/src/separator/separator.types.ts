import type { SeparatorProps as AriaSeparatorProps } from "@react-aria/separator";
import type { ComponentPropsWithoutRef, ComponentRef, Ref } from "react";

export type SeparatorProps = AriaSeparatorProps &
  ComponentPropsWithoutRef<"hr"> & {
    ref?: Ref<ComponentRef<"hr">>;
  };
