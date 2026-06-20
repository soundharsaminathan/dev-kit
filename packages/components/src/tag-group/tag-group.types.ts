import type { AriaTagGroupProps } from "@react-aria/tag";
import type { TagGroupState } from "@react-stately/tag";
import type { Key } from "@react-types/shared";
import type { ComponentPropsWithoutRef, ReactNode, RefObject } from "react";
import type { CollectionItem } from "../list-box/collection-utils";

export type TagItem = CollectionItem & {
  href?: string | undefined;
};

export type TagGroupProps<T extends TagItem = TagItem> = Omit<
  AriaTagGroupProps<T>,
  "onRemove"
> & {
  size?: "sm" | "md" | "lg" | undefined;
  className?: string | undefined;
  children?: ReactNode;
  onRemove?: ((keys: Set<Key>) => void) | undefined;
};

export type TagListProps = ComponentPropsWithoutRef<"div">;

export type TagProps = {
  id?: Key | undefined;
  textValue?: string | undefined;
  isDisabled?: boolean | undefined;
  href?: string | undefined;
  children?: ReactNode;
  className?: string | undefined;
};

export type TagGroupLabelProps = ComponentPropsWithoutRef<"span">;

export type TagGroupContextValue<T extends TagItem = TagItem> = {
  state: TagGroupState<T>;
  gridProps: React.HTMLAttributes<HTMLDivElement>;
  labelProps: React.HTMLAttributes<HTMLElement>;
  descriptionProps: React.HTMLAttributes<HTMLElement>;
  errorMessageProps: React.HTMLAttributes<HTMLElement>;
  listRef: RefObject<HTMLDivElement | null>;
  size: "sm" | "md" | "lg";
};
