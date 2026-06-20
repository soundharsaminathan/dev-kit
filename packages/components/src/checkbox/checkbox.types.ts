import type { AriaCheckboxProps } from "@react-aria/checkbox";
import type { ReactNode, Ref } from "react";

export type CheckboxProps = AriaCheckboxProps & {
  children?: ReactNode;
  className?: string;
  ref?: Ref<HTMLDivElement>;
};

export type CheckboxControlProps = AriaCheckboxProps & {
  className?: string | undefined;
  children?: ReactNode;
  ref?: Ref<HTMLLabelElement> | undefined;
  value?: string | undefined;
};

export type CheckboxIndicatorProps = React.ComponentPropsWithoutRef<"span">;
