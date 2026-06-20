import type { AriaColorSwatchProps } from "@react-aria/color";
import type { CSSProperties, Ref } from "react";

export type ColorSwatchProps = AriaColorSwatchProps & {
  className?: string | undefined;
  style?: CSSProperties | undefined;
  ref?: Ref<HTMLDivElement>;
};
