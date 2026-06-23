import { cn, composeRefs } from "@dev-ui/core";
import { useButton } from "@react-aria/button";
import { useFocusRing } from "@react-aria/focus";
import { useSearchField } from "@react-aria/searchfield";
import { mergeProps } from "@react-aria/utils";
import { useSearchFieldState } from "@react-stately/searchfield";
import { createContext, useContext, useMemo, useRef } from "react";
import { useOptionalAutocompleteContext } from "../autocomplete/autocomplete-context";
import { Field } from "../field/Field";
import { useFieldContext, useFieldInputAria } from "../field/field-context";
import styles from "./search-field.module.scss";
import type {
  SearchFieldClearProps,
  SearchFieldContextValue,
  SearchFieldGroupProps,
  SearchFieldInputProps,
  SearchFieldProps,
} from "./search-field.types";

const SearchFieldContext = createContext<SearchFieldContextValue | null>(null);

function useSearchFieldContext(component: string): SearchFieldContextValue {
  const context = useContext(SearchFieldContext);
  if (!context) {
    throw new Error(`${component} must be used within SearchField`);
  }
  return context;
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={styles.icon}
    >
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path
        d="M20 20l-3-3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 6L6 18M6 6l12 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SearchField({
  children,
  className,
  placeholder,
  isDisabled,
  ...props
}: SearchFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const ariaProps: Parameters<typeof useSearchField>[0] = {
    ...props,
    ...(isDisabled !== undefined ? { isDisabled } : {}),
  };
  const state = useSearchFieldState(props);
  const { inputProps, clearButtonProps } = useSearchField(
    ariaProps,
    state,
    inputRef,
  );

  const contextValue = useMemo(
    () => ({
      state,
      inputRef,
      inputProps,
      clearButtonProps,
      isDisabled: Boolean(isDisabled),
    }),
    [state, inputProps, clearButtonProps, isDisabled],
  );

  return (
    <SearchFieldContext.Provider value={contextValue}>
      <Field
        data-search-field=""
        data-slot="search-field"
        className={className}
      >
        {children ?? (
          <SearchFieldGroup>
            <SearchIcon />
            <SearchFieldInput placeholder={placeholder} />
            <SearchFieldClear />
          </SearchFieldGroup>
        )}
      </Field>
    </SearchFieldContext.Provider>
  );
}

function SearchFieldGroup({ className, children }: SearchFieldGroupProps) {
  const { isDisabled } = useSearchFieldContext("SearchFieldGroup");

  return (
    <div
      data-search-field-group=""
      data-disabled={isDisabled ? "true" : undefined}
      className={cn(styles.group, className)}
    >
      {children}
    </div>
  );
}

function SearchFieldInput({
  ref,
  className,
  placeholder,
}: SearchFieldInputProps) {
  const autocomplete = useOptionalAutocompleteContext();
  const { inputRef, inputProps, isDisabled } =
    useSearchFieldContext("SearchFieldInput");
  const field = useFieldContext();
  const { focusProps, isFocusVisible } = useFocusRing({ isTextInput: true });

  const inputAria = inputProps as React.InputHTMLAttributes<HTMLInputElement>;
  const fieldAria = useFieldInputAria(inputAria);
  const resolvedInputProps = autocomplete
    ? mergeProps(focusProps, { type: "search" }, autocomplete.inputProps, {
        value: autocomplete.autocompleteState.inputValue,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
          autocomplete.inputProps.onChange?.(event.target.value);
        },
      })
    : mergeProps(inputProps, focusProps);

  return (
    <input
      {...resolvedInputProps}
      {...fieldAria}
      ref={composeRefs(autocomplete?.inputRef ?? inputRef, ref)}
      id={field?.inputId}
      placeholder={placeholder}
      data-search-field-input=""
      data-input-control=""
      data-focus-visible={isFocusVisible ? "true" : undefined}
      data-disabled={isDisabled ? "true" : undefined}
      className={cn(styles.input, className)}
    />
  );
}

function SearchFieldClear({
  ref,
  className,
  children,
  ...props
}: SearchFieldClearProps) {
  const autocomplete = useOptionalAutocompleteContext();
  const { state, clearButtonProps } = useSearchFieldContext("SearchFieldClear");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { buttonProps } = useButton(
    clearButtonProps as Parameters<typeof useButton>[0],
    buttonRef,
  );
  const value = autocomplete?.autocompleteState.inputValue ?? state.value;

  if (!value) {
    return null;
  }

  return (
    <button
      {...mergeProps(buttonProps, props)}
      ref={composeRefs(buttonRef, ref)}
      type="button"
      data-search-field-clear=""
      className={cn(styles.clear, className)}
    >
      {children ?? <ClearIcon />}
    </button>
  );
}

export type {
  SearchFieldClearProps,
  SearchFieldGroupProps,
  SearchFieldInputProps,
  SearchFieldProps,
} from "./search-field.types";
export { SearchField, SearchFieldClear, SearchFieldGroup, SearchFieldInput };
