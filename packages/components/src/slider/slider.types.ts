import type { AriaSliderProps } from "@react-aria/slider";
import type { ReactNode, Ref } from "react";

export type SliderOrientation = "horizontal" | "vertical";

export type SliderProps = AriaSliderProps & {
  className?: string;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
};

export type SliderControlProps = React.ComponentPropsWithoutRef<"div">;
export type SliderTrackProps = React.ComponentPropsWithoutRef<"div">;
export type SliderFillProps = React.ComponentPropsWithoutRef<"div">;
export type SliderThumbProps = React.ComponentPropsWithoutRef<"div"> & {
  index?: number | undefined;
};
export type SliderOutputProps = React.ComponentPropsWithoutRef<"output">;
