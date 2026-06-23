import type { AutocompleteProps as StatelyAutocompleteProps } from "@react-stately/autocomplete";
import type { ComponentPropsWithoutRef } from "react";

export type AutocompleteVariant = "default" | "borderless";

export type AutocompleteProps = Omit<StatelyAutocompleteProps, "children"> &
  Omit<ComponentPropsWithoutRef<"div">, "children"> & {
    children?: React.ReactNode;
    className?: string | undefined;
    variant?: AutocompleteVariant | undefined;
    filter?: Intl.CollatorOptions | undefined;
  };
