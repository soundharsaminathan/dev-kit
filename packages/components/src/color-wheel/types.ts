import type { AriaColorWheelProps } from "@react-aria/color";
import type { ReactNode, Ref } from "react";

export type ColorWheelProps = Omit<
  AriaColorWheelProps,
  "outerRadius" | "innerRadius"
> & {
  outerRadius?: number | undefined;
  innerRadius?: number | undefined;
  className?: string | undefined;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
  isDisabled?: boolean | undefined;
};

export type ColorWheelTrackProps = React.ComponentPropsWithoutRef<"div">;
