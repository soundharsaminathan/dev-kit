import { cn } from "@dev-ui/core";
import { useAutocomplete } from "@react-aria/autocomplete";
import { useFilter } from "@react-aria/i18n";
import { useAutocompleteState } from "@react-stately/autocomplete";
import { useCallback, useMemo, useRef } from "react";
import styles from "./autocomplete.module.scss";
import type { AutocompleteProps } from "./autocomplete.types";
import { AutocompleteContext } from "./autocomplete-context";

function Autocomplete({
  children,
  className,
  filter: filterOptions,
  variant = "default",
  ...props
}: AutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const collectionRef = useRef<HTMLUListElement>(null);
  const { contains } = useFilter({
    sensitivity: "base",
    ignorePunctuation: true,
    ...filterOptions,
  });
  const autocompleteState = useAutocompleteState(props);
  const {
    inputProps,
    collectionProps,
    filter: _autocompleteFilter,
  } = useAutocomplete(
    {
      ...props,
      inputRef,
      collectionRef,
      filter: contains,
    },
    autocompleteState,
  );

  const nodeFilter = useCallback(
    (nodeTextValue: string) => {
      const query = autocompleteState.inputValue;
      if (!query) {
        return true;
      }
      return contains(String(nodeTextValue ?? ""), String(query ?? ""));
    },
    [contains, autocompleteState.inputValue],
  );

  const contextValue = useMemo(
    () => ({
      inputRef,
      collectionRef,
      inputProps,
      collectionProps,
      autocompleteState,
      nodeFilter,
    }),
    [inputProps, collectionProps, autocompleteState, nodeFilter],
  );

  return (
    <AutocompleteContext.Provider value={contextValue}>
      <div
        data-autocomplete=""
        data-variant={variant}
        className={cn(styles.root, className)}
      >
        {children}
      </div>
    </AutocompleteContext.Provider>
  );
}

export { Autocomplete };
