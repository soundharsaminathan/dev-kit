import type { InputProps } from "@react-aria/autocomplete";
import type { AriaListBoxOptions } from "@react-aria/listbox";
import type { AutocompleteState } from "@react-stately/autocomplete";
import type { RefObject } from "react";
import { createContext, useContext } from "react";

export type CommandContextValue = {
  inputRef: RefObject<HTMLInputElement | null>;
  collectionRef: RefObject<HTMLUListElement | null>;
  inputProps: InputProps;
  collectionProps: Partial<AriaListBoxOptions<object>>;
  autocompleteState: AutocompleteState;
  nodeFilter: (nodeTextValue: string) => boolean;
};

export const CommandContext = createContext<CommandContextValue | null>(null);

export function useOptionalCommandContext(): CommandContextValue | null {
  return useContext(CommandContext);
}
