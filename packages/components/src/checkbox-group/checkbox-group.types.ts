import type { AriaCheckboxGroupProps } from "@react-aria/checkbox";
import type { ReactNode, Ref } from "react";

export type CheckboxGroupProps = AriaCheckboxGroupProps & {
  className?: string;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
};
