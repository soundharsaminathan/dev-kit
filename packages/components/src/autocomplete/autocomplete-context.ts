import type { InputProps } from "@react-aria/autocomplete";
import type { AriaListBoxOptions } from "@react-aria/listbox";
import type { AutocompleteState } from "@react-stately/autocomplete";
import type { RefObject } from "react";
import { createContext, useContext } from "react";

export type AutocompleteContextValue = {
  inputRef: RefObject<HTMLInputElement | null>;
  collectionRef: RefObject<HTMLUListElement | null>;
  inputProps: InputProps;
  collectionProps: Partial<AriaListBoxOptions<object>>;
  autocompleteState: AutocompleteState;
  nodeFilter: (nodeTextValue: string) => boolean;
};

export const AutocompleteContext =
  createContext<AutocompleteContextValue | null>(null);

export function useOptionalAutocompleteContext(): AutocompleteContextValue | null {
  return useContext(AutocompleteContext);
}
