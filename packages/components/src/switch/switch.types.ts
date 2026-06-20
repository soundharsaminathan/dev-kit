import type { AriaSwitchProps } from "@react-aria/switch";
import type { ReactNode, Ref } from "react";

export type SwitchSize = "sm" | "md" | "lg";

export type SwitchProps = AriaSwitchProps & {
  size?: SwitchSize | undefined;
  children?: ReactNode;
  className?: string;
  ref?: Ref<HTMLDivElement>;
};

export type SwitchControlProps = AriaSwitchProps & {
  size?: SwitchSize | undefined;
  className?: string;
  children?: ReactNode;
  ref?: Ref<HTMLLabelElement>;
};

export type SwitchIndicatorProps = React.ComponentPropsWithoutRef<"span">;
export type SwitchThumbProps = React.ComponentPropsWithoutRef<"span">;
