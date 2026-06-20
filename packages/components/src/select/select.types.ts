import type { AriaListBoxOptions } from "@react-aria/listbox";
import type { Placement } from "@react-aria/overlays";
import type { AriaSelectProps } from "@react-aria/select";
import type { SelectState } from "@react-stately/select";
import type { ReactNode, Ref } from "react";
import type { ButtonProps } from "../button/button.types";
import type { CollectionItem } from "../list-box/collection-utils";
import type { ListBoxProps } from "../list-box/list-box.types";

export type SelectProps<T extends CollectionItem = CollectionItem> = Omit<
  AriaSelectProps<T>,
  "children"
> & {
  items?: Iterable<T> | undefined;
  children?: ReactNode | undefined;
  placeholder?: string | undefined;
  className?: string | undefined;
  ref?: Ref<HTMLDivElement>;
};

export type SelectTriggerProps = ButtonProps;

export type SelectValueProps = {
  className?: string | undefined;
  placeholder?: string | undefined;
};

export type SelectContentProps<T extends CollectionItem = CollectionItem> =
  Omit<ListBoxProps<T>, "items" | "children"> & {
    children?: ReactNode;
    placement?: Placement | undefined;
    className?: string | undefined;
  };

export type SelectContextValue<T extends object = CollectionItem> = {
  state: SelectState<T>;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  triggerProps: React.HTMLAttributes<HTMLElement>;
  valueProps: React.HTMLAttributes<HTMLElement>;
  menuProps: AriaListBoxOptions<T>;
  labelProps: React.HTMLAttributes<HTMLElement>;
  placeholder?: string | undefined;
  isDisabled: boolean;
};
