import type { AutocompleteProps } from "@react-stately/autocomplete";
import type { ComponentPropsWithoutRef } from "react";

export type CommandVariant = "default" | "borderless";

export type CommandProps = Omit<AutocompleteProps, "children"> &
  Omit<ComponentPropsWithoutRef<"div">, "children"> & {
    children?: React.ReactNode;
    className?: string | undefined;
    variant?: CommandVariant | undefined;
    filter?: Intl.CollatorOptions | undefined;
  };
