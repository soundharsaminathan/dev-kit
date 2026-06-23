import type { ComponentPropsWithoutRef, ComponentRef, Ref } from "react";

export type LinkVariant = "accent" | "quiet" | "unstyled";

export type LinkProps = ComponentPropsWithoutRef<"a"> & {
  href?: string;
  isDisabled?: boolean;
  variant?: LinkVariant | undefined;
  ref?: Ref<ComponentRef<"a">>;
};
