import type { AriaProgressBarProps } from "@react-aria/progress";
import type { ComponentPropsWithoutRef, Ref } from "react";

export type LoaderVariant = "spinner" | "ring";

export type LoaderProps = AriaProgressBarProps &
  Omit<ComponentPropsWithoutRef<"div">, keyof AriaProgressBarProps> & {
    variant?: LoaderVariant | undefined;
    ref?: Ref<HTMLDivElement>;
  };
