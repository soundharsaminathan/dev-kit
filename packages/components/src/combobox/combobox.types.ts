import type { AriaComboBoxProps } from "@react-aria/combobox";
import type { AriaListBoxOptions } from "@react-aria/listbox";
import type { Placement } from "@react-aria/overlays";
import type { ComboBoxState } from "@react-stately/combobox";
import type { ReactNode, Ref } from "react";
import type { CollectionItem } from "../list-box/collection-utils";

export type ComboboxProps<T extends CollectionItem = CollectionItem> = Omit<
  AriaComboBoxProps<T>,
  "children"
> & {
  items?: Iterable<T> | undefined;
  children?: ReactNode | undefined;
  className?: string | undefined;
  ref?: Ref<HTMLDivElement>;
};

export type ComboboxValueProps = {
  className?: string | undefined;
  children?: ReactNode;
};

export type ComboboxContextValue<T extends object = CollectionItem> = {
  state: ComboBoxState<T>;
  inputProps: React.InputHTMLAttributes<HTMLInputElement>;
  listBoxProps: AriaListBoxOptions<T>;
  buttonProps: React.HTMLAttributes<HTMLElement>;
  labelProps: React.HTMLAttributes<HTMLElement>;
  inputRef: React.RefObject<HTMLInputElement | null>;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
  listBoxRef: React.RefObject<HTMLUListElement | null>;
  popoverRef: React.RefObject<HTMLDivElement | null>;
  isDisabled: boolean;
};

export type ComboboxPopoverProps = {
  children?: ReactNode;
  placement?: Placement | undefined;
  className?: string | undefined;
};
