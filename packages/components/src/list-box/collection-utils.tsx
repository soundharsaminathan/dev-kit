import { Item } from "@react-stately/collections";
import type { CollectionElement, Key } from "@react-types/shared";
import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";

export type CollectionItem = {
  id: Key;
  label: ReactNode;
  textValue?: string | undefined;
  isDisabled?: boolean | undefined;
  variant?: "default" | "danger" | undefined;
};

export function findChildByDisplayName(
  children: ReactNode,
  displayName: string,
): ReactElement | null {
  let found: ReactElement | null = null;
  Children.forEach(children, (child) => {
    if (found || !isValidElement(child)) {
      return;
    }
    const type = child.type as { displayName?: string };
    if (type.displayName === displayName) {
      found = child;
    }
  });
  return found;
}

export function parseCollectionItems(
  children: ReactNode,
  itemDisplayName = "ListBoxItem",
): CollectionItem[] {
  const items: CollectionItem[] = [];

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) {
      return;
    }
    const type = child.type as { displayName?: string };
    if (
      type.displayName === "ListBoxSection" ||
      type.displayName === "MenuSection"
    ) {
      items.push(
        ...parseCollectionItems(
          (child.props as { children?: ReactNode }).children,
          itemDisplayName,
        ),
      );
      return;
    }
    if (type.displayName === itemDisplayName) {
      const props = child.props as {
        id?: Key;
        textValue?: string;
        isDisabled?: boolean;
        variant?: "default" | "danger";
        children?: ReactNode;
      };
      const label = props.children;
      const id = props.id ?? props.textValue ?? String(label);
      items.push({
        id,
        label,
        textValue:
          props.textValue ?? (typeof label === "string" ? label : undefined),
        ...(props.isDisabled !== undefined
          ? { isDisabled: props.isDisabled }
          : {}),
        ...(props.variant !== undefined ? { variant: props.variant } : {}),
      });
    }
  });

  return items;
}

export function getCollectionChild<T extends CollectionItem>(
  item: T,
): CollectionElement<T> {
  return (
    <Item key={item.id} textValue={getItemTextValue(item)}>
      {item.label}
    </Item>
  ) as CollectionElement<T>;
}

export function getItemTextValue(item: CollectionItem): string {
  if (item.textValue) {
    return item.textValue;
  }
  if (typeof item.label === "string") {
    return item.label;
  }
  return String(item.id);
}

export function getDisabledKeys(items: CollectionItem[]): Set<Key> {
  const keys = new Set<Key>();
  for (const item of items) {
    if (item.isDisabled) {
      keys.add(item.id);
    }
  }
  return keys;
}
