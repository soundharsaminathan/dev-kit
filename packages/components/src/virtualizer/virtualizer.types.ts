import type { ListLayoutOptions } from "@react-stately/layout";
import type { ReactNode, Ref } from "react";
import type { CollectionItem } from "../list-box/collection-utils";

export type VirtualizerProps<T extends CollectionItem = CollectionItem> = {
  items: Iterable<T>;
  height: number;
  "aria-label": string;
  rowHeight?: number | undefined;
  selectionMode?: "single" | "multiple" | "none" | undefined;
  className?: string | undefined;
  ref?: Ref<HTMLDivElement>;
  renderItem?: ((item: T) => ReactNode) | undefined;
  layoutOptions?: ListLayoutOptions | undefined;
};

export type VirtualizerItemProps = {
  children?: ReactNode;
};
