import { cn } from "@dev-ui/core";
import { useAutocomplete } from "@react-aria/autocomplete";
import { useFilter } from "@react-aria/i18n";
import { useAutocompleteState } from "@react-stately/autocomplete";
import { useCallback, useMemo, useRef } from "react";
import styles from "./command.module.scss";
import type { CommandProps } from "./command.types";
import { CommandContext } from "./command-context";

function Command({
  children,
  className,
  filter: filterOptions,
  variant = "default",
  ...props
}: CommandProps) {
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
    <CommandContext.Provider value={contextValue}>
      <div
        data-command=""
        data-variant={variant}
        className={cn(styles.root, className)}
      >
        {children}
      </div>
    </CommandContext.Provider>
  );
}

export { Command };
