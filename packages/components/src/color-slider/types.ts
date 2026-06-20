import type { AriaColorSliderProps } from "@react-aria/color";
import type { ReactNode, Ref } from "react";

export type ColorSliderOrientation = "horizontal" | "vertical";

export type ColorSliderProps = AriaColorSliderProps & {
  className?: string | undefined;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
  isDisabled?: boolean | undefined;
};

export type ColorSliderControlProps = React.ComponentPropsWithoutRef<"div">;
export type ColorSliderOutputProps = React.ComponentPropsWithoutRef<"output">;
