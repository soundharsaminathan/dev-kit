import type { AriaRadioGroupProps, AriaRadioProps } from "@react-aria/radio";
import type { ReactNode, Ref } from "react";

export type RadioGroupProps = AriaRadioGroupProps & {
  className?: string;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
};

export type RadioProps = Omit<AriaRadioProps, "value"> & {
  value: string;
  children?: ReactNode;
  className?: string;
  ref?: Ref<HTMLDivElement>;
};

export type RadioControlProps = AriaRadioProps & {
  className?: string;
  children?: ReactNode;
  ref?: Ref<HTMLLabelElement>;
};

export type RadioIndicatorProps = React.ComponentPropsWithoutRef<"span">;
