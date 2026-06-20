import type { Ref, TextareaHTMLAttributes } from "react";
import type { InputSize } from "../input/input.types";

export type TextAreaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "size"
> & {
  size?: InputSize | undefined;
  isDisabled?: boolean | undefined;
  ref?: Ref<HTMLTextAreaElement>;
};
