import type { InputHTMLAttributes, Ref } from "react";

export type InputSize = "sm" | "md" | "lg";

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  size?: InputSize | undefined;
  isDisabled?: boolean | undefined;
  ref?: Ref<HTMLInputElement>;
};
