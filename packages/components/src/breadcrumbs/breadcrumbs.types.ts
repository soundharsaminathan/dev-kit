import type {
  AriaBreadcrumbItemProps,
  AriaBreadcrumbsProps,
} from "@react-aria/breadcrumbs";
import type { Key } from "@react-types/shared";
import type { ReactNode, Ref } from "react";

export type BreadcrumbCollectionItem = {
  id: Key;
  label: ReactNode;
  href?: string | undefined;
  isDisabled?: boolean | undefined;
};

export type BreadcrumbsProps<
  T extends BreadcrumbCollectionItem = BreadcrumbCollectionItem,
> = AriaBreadcrumbsProps & {
  children?: ReactNode | ((item: T) => ReactNode);
  className?: string | undefined;
  isDisabled?: boolean | undefined;
  items?: Iterable<T> | undefined;
  onAction?: ((key: Key) => void) | undefined;
  ref?: Ref<HTMLOListElement>;
};

export type BreadcrumbItemProps = {
  id?: Key | undefined;
  index?: number | undefined;
  isCurrent?: boolean | undefined;
  isDisabled?: boolean | undefined;
  children?: ReactNode;
  className?: string | undefined;
  ref?: Ref<HTMLLIElement>;
};

export type BreadcrumbLinkProps = React.ComponentPropsWithoutRef<"a"> & {
  children?: ReactNode;
  className?: string | undefined;
  href?: string | undefined;
  isDisabled?: boolean | undefined;
  ref?: Ref<HTMLAnchorElement>;
};

export type BreadcrumbSeparatorProps =
  React.ComponentPropsWithoutRef<"span"> & {
    children?: ReactNode;
    className?: string | undefined;
  };

export type BreadcrumbsContextValue = {
  isDisabled?: boolean | undefined;
  onAction?: ((key: Key) => void) | undefined;
};

export type BreadcrumbItemContextValue = {
  itemProps: React.HTMLAttributes<HTMLElement>;
  isCurrent: boolean;
  isDisabled: boolean;
  linkRef: React.RefObject<HTMLAnchorElement | null>;
};

export type { AriaBreadcrumbItemProps };
