import type { HTMLAttributes, Ref } from "react";

export type GroupOrientation = "horizontal" | "vertical";

export type GroupProps = HTMLAttributes<HTMLDivElement> & {
  orientation?: GroupOrientation | undefined;
  isDisabled?: boolean | undefined;
  isInvalid?: boolean | undefined;
  ref?: Ref<HTMLDivElement>;
};

export type GroupTextProps = HTMLAttributes<HTMLSpanElement> & {
  ref?: Ref<HTMLSpanElement>;
};
