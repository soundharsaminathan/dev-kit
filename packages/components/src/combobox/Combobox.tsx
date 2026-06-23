import { cn, composeRefs } from "@dev-ui/core";
import { useComboBox } from "@react-aria/combobox";
import { useFocusRing } from "@react-aria/focus";
import { OverlayContainer } from "@react-aria/overlays";
import { mergeProps } from "@react-aria/utils";
import { useComboBoxState } from "@react-stately/combobox";
import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useRef,
} from "react";
import { Button } from "../button/Button";
import type { ButtonProps } from "../button/button.types";
import { Field } from "../field/Field";
import { Input } from "../input/Input";
import type { InputProps } from "../input/input.types";
import {
  type CollectionItem,
  findChildByDisplayName,
  getCollectionChild,
  parseCollectionItems,
} from "../list-box/collection-utils";
import { ListBoxWithState } from "../list-box/ListBox";
import { Popover, PopoverProvider } from "../popover/Popover";
import styles from "./combobox.module.scss";
import type {
  ComboboxContextValue,
  ComboboxPopoverProps,
  ComboboxProps,
  ComboboxValueProps,
} from "./combobox.types";

const ComboboxContext = createContext<ComboboxContextValue | null>(null);

function useComboboxContext(component: string): ComboboxContextValue {
  const context = useContext(ComboboxContext);
  if (!context) {
    throw new Error(`${component} must be used within Combobox`);
  }
  return context;
}

function Combobox<T extends CollectionItem>({
  children,
  items: itemsProp,
  className,
  isDisabled,
  menuTrigger = "focus",
  ...props
}: ComboboxProps<T>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listBoxRef = useRef<HTMLUListElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const popoverChild = findChildByDisplayName(children, "ComboboxPopover");
  const itemsList = useMemo((): CollectionItem[] => {
    if (itemsProp) {
      return [...itemsProp];
    }
    if (popoverChild) {
      return parseCollectionItems(
        (popoverChild.props as { children?: ReactNode }).children,
      );
    }
    return [];
  }, [itemsProp, popoverChild]);

  const disabledKeys = useMemo(
    () =>
      new Set(
        itemsList.filter((item) => item.isDisabled).map((item) => item.id),
      ),
    [itemsList],
  );

  const state = useComboBoxState({
    ...props,
    menuTrigger,
    items: itemsList as Iterable<T>,
    disabledKeys,
    children: getCollectionChild,
    ...(isDisabled !== undefined ? { isDisabled } : {}),
  });

  const {
    labelProps,
    inputProps,
    listBoxProps,
    buttonProps,
    descriptionProps,
    errorMessageProps,
  } = useComboBox(
    {
      ...props,
      menuTrigger,
      inputRef,
      buttonRef,
      listBoxRef,
      popoverRef,
      ...(isDisabled !== undefined ? { isDisabled } : {}),
    },
    state,
  );

  const contextValue = useMemo(
    () => ({
      state,
      inputProps,
      listBoxProps,
      buttonProps,
      labelProps,
      inputRef,
      buttonRef,
      listBoxRef,
      popoverRef,
      isDisabled: Boolean(isDisabled),
    }),
    [state, inputProps, listBoxProps, buttonProps, labelProps, isDisabled],
  );

  return (
    <ComboboxContext.Provider value={contextValue as ComboboxContextValue}>
      <PopoverProvider
        value={{
          triggerRef: inputRef,
          popoverRef,
          state,
          isNonModal: true,
        }}
      >
        <Field
          data-combobox=""
          data-slot="combobox"
          className={cn(styles.root, className)}
        >
          {props.label ? <span {...labelProps}>{props.label}</span> : null}
          {props.description ? (
            <span {...descriptionProps}>{props.description}</span>
          ) : null}
          {children}
          {typeof props.errorMessage ===
          "function" ? null : props.errorMessage ? (
            <div {...errorMessageProps}>{props.errorMessage}</div>
          ) : null}
        </Field>
      </PopoverProvider>
    </ComboboxContext.Provider>
  );
}

function ComboboxValue({ className, children }: ComboboxValueProps) {
  return (
    <span data-combobox-value="" className={cn(styles.value, className)}>
      {children}
    </span>
  );
}
ComboboxValue.displayName = "ComboboxValue";

function ComboboxPopover({ className, placement }: ComboboxPopoverProps) {
  const { state, listBoxProps, listBoxRef } =
    useComboboxContext("ComboboxPopover");

  if (!state.isOpen) {
    return null;
  }

  return (
    <OverlayContainer>
      <Popover placement={placement ?? "bottom start"}>
        <ListBoxWithState
          ref={listBoxRef}
          state={state}
          listBoxOptions={{
            ...listBoxProps,
            selectionMode: state.selectionManager.selectionMode,
          }}
          className={cn(styles.list, className)}
        />
      </Popover>
    </OverlayContainer>
  );
}
ComboboxPopover.displayName = "ComboboxPopover";

function ComboboxInput({ ref, className, ...props }: InputProps) {
  const { inputProps, inputRef, isDisabled } =
    useComboboxContext("ComboboxInput");
  const { focusProps, isFocusVisible } = useFocusRing({ isTextInput: true });

  return (
    <Input
      {...mergeProps(inputProps, focusProps, props)}
      ref={composeRefs(inputRef, ref)}
      isDisabled={props.isDisabled ?? isDisabled}
      data-focused={isFocusVisible ? "true" : undefined}
      className={className}
    />
  );
}
ComboboxInput.displayName = "ComboboxInput";

function ComboboxButton({ ref, className, ...props }: ButtonProps) {
  const { buttonProps, buttonRef, isDisabled } =
    useComboboxContext("ComboboxButton");

  return (
    <Button
      {...mergeProps(buttonProps, props)}
      ref={composeRefs(buttonRef, ref)}
      variant="quiet"
      isIconOnly
      isDisabled={props.isDisabled ?? isDisabled}
      className={className}
    />
  );
}
ComboboxButton.displayName = "ComboboxButton";

export { ListBoxItem as ComboboxItem } from "../list-box/ListBox";
export type {
  ComboboxPopoverProps,
  ComboboxProps,
  ComboboxValueProps,
} from "./combobox.types";
export {
  Combobox,
  ComboboxButton,
  ComboboxContext,
  ComboboxInput,
  ComboboxPopover,
  ComboboxValue,
};
