import type { AriaColorAreaProps } from "@react-aria/color";
import type { ReactNode, Ref } from "react";

export type ColorAreaProps = AriaColorAreaProps & {
  className?: string;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
};
