import { cn, composeRefs } from "@dev-ui/core";
import { useBreadcrumbItem, useBreadcrumbs } from "@react-aria/breadcrumbs";
import { useFocusRing } from "@react-aria/focus";
import { useHover } from "@react-aria/interactions";
import { useLink } from "@react-aria/link";
import { mergeProps } from "@react-aria/utils";
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useContext,
  useMemo,
  useRef,
} from "react";
import styles from "./breadcrumbs.module.scss";
import type {
  BreadcrumbCollectionItem,
  BreadcrumbItemContextValue,
  BreadcrumbItemProps,
  BreadcrumbLinkProps,
  BreadcrumbSeparatorProps,
  BreadcrumbsContextValue,
  BreadcrumbsProps,
} from "./breadcrumbs.types";

const BreadcrumbsContext = createContext<BreadcrumbsContextValue | null>(null);
const BreadcrumbItemContext = createContext<BreadcrumbItemContextValue | null>(
  null,
);

function useBreadcrumbsContext(component: string): BreadcrumbsContextValue {
  const context = useContext(BreadcrumbsContext);
  if (!context) {
    throw new Error(`${component} must be used within Breadcrumbs`);
  }
  return context;
}

function useBreadcrumbItemContext(
  component: string,
): BreadcrumbItemContextValue {
  const context = useContext(BreadcrumbItemContext);
  if (!context) {
    throw new Error(`${component} must be used within BreadcrumbItem`);
  }
  return context;
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function isBreadcrumbItemElement(
  child: ReactNode,
): child is ReactElement<BreadcrumbItemProps> {
  if (!isValidElement(child)) {
    return false;
  }
  const type = child.type as { displayName?: string };
  return type.displayName === "BreadcrumbItem";
}

function getBreadcrumbItems(children: ReactNode) {
  return Children.toArray(children).filter(isBreadcrumbItemElement);
}

function Breadcrumbs<T extends BreadcrumbCollectionItem>({
  children,
  className,
  items,
  ref,
  isDisabled,
  onAction,
  ...props
}: BreadcrumbsProps<T>) {
  const { navProps } = useBreadcrumbs(props);

  const contextValue = useMemo(
    () => ({
      isDisabled,
      onAction,
    }),
    [isDisabled, onAction],
  );

  const renderedChildren = useMemo((): ReactNode => {
    if (items) {
      const itemList = [...items];
      const renderItem =
        typeof children === "function"
          ? children
          : (item: T) => (
              <BreadcrumbItem id={item.id} isDisabled={item.isDisabled}>
                <BreadcrumbLink
                  {...(item.href !== undefined ? { href: item.href } : {})}
                >
                  {item.label}
                </BreadcrumbLink>
                <BreadcrumbSeparator />
              </BreadcrumbItem>
            );

      return itemList.map((item, index) => {
        const isCurrent = index === itemList.length - 1;
        const element = renderItem(item);
        if (!isValidElement<BreadcrumbItemProps>(element)) {
          return element;
        }

        return cloneElement(element, {
          key: item.id ?? index,
          id: element.props.id ?? item.id,
          isCurrent,
          index,
          ...(isCurrent
            ? {
                children: Children.map(element.props.children, (child) => {
                  if (
                    isValidElement(child) &&
                    (child.type as { displayName?: string }).displayName ===
                      "BreadcrumbSeparator"
                  ) {
                    return null;
                  }
                  return child;
                }),
              }
            : {}),
        });
      });
    }

    if (typeof children === "function") {
      return null;
    }

    const breadcrumbItems = getBreadcrumbItems(children);
    const lastIndex = breadcrumbItems.length - 1;
    let itemIndex = 0;

    return Children.map(children, (child) => {
      if (!isBreadcrumbItemElement(child)) {
        return child;
      }

      const currentIndex = itemIndex;
      itemIndex += 1;

      return cloneElement(child, {
        isCurrent: currentIndex === lastIndex,
        index: currentIndex,
      });
    });
  }, [children, items]);

  return (
    <BreadcrumbsContext.Provider value={contextValue}>
      <ol
        {...navProps}
        ref={ref}
        data-breadcrumbs=""
        className={cn(styles.root, className)}
      >
        {renderedChildren}
      </ol>
    </BreadcrumbsContext.Provider>
  );
}

function BreadcrumbItem({
  id,
  index = 0,
  isCurrent = false,
  isDisabled: itemDisabled,
  children,
  className,
  ref,
}: BreadcrumbItemProps) {
  const { isDisabled: groupDisabled, onAction } =
    useBreadcrumbsContext("BreadcrumbItem");
  const key = id ?? index;
  const linkRef = useRef<HTMLAnchorElement>(null);
  const disabled = Boolean(itemDisabled || groupDisabled);

  const { itemProps } = useBreadcrumbItem(
    {
      id: String(key),
      isCurrent,
      isDisabled: disabled,
      children,
      ...(onAction ? { onPress: () => onAction(key) } : {}),
    },
    linkRef,
  );

  const itemContextValue = useMemo(
    () => ({
      itemProps,
      isCurrent,
      isDisabled: disabled,
      linkRef,
    }),
    [itemProps, isCurrent, disabled],
  );

  return (
    <BreadcrumbItemContext.Provider value={itemContextValue}>
      <li
        ref={ref}
        data-breadcrumb-item=""
        className={cn(styles.item, className)}
      >
        {children}
      </li>
    </BreadcrumbItemContext.Provider>
  );
}
BreadcrumbItem.displayName = "BreadcrumbItem";

function BreadcrumbLink({
  children,
  className,
  ref,
  isDisabled,
  ...props
}: BreadcrumbLinkProps) {
  const {
    itemProps,
    isCurrent,
    isDisabled: itemDisabled,
    linkRef,
  } = useBreadcrumbItemContext("BreadcrumbLink");
  const disabled = Boolean(isDisabled ?? itemDisabled);
  const domRef = useRef<HTMLAnchorElement>(null);

  const { linkProps, isPressed } = useLink(
    {
      ...props,
      isDisabled: disabled,
    } as Parameters<typeof useLink>[0],
    domRef,
  );
  const { hoverProps, isHovered } = useHover({ isDisabled: disabled });
  const { focusProps, isFocusVisible } = useFocusRing();

  return (
    <a
      {...mergeProps(itemProps, linkProps, hoverProps, focusProps, props)}
      ref={composeRefs(linkRef, domRef, ref)}
      data-breadcrumb-link=""
      data-current={isCurrent ? "true" : undefined}
      data-disabled={disabled ? "true" : undefined}
      data-hovered={isHovered ? "true" : undefined}
      data-pressed={isPressed ? "true" : undefined}
      data-focus-visible={isFocusVisible ? "true" : undefined}
      className={cn(styles.link, className)}
    >
      {children}
    </a>
  );
}
BreadcrumbLink.displayName = "BreadcrumbLink";

function BreadcrumbSeparator({
  children,
  className,
  ...props
}: BreadcrumbSeparatorProps) {
  return (
    <span
      {...props}
      data-breadcrumb-separator=""
      aria-hidden="true"
      className={cn(styles.separator, className)}
    >
      {children ?? <ChevronRightIcon />}
    </span>
  );
}
BreadcrumbSeparator.displayName = "BreadcrumbSeparator";

export type {
  BreadcrumbCollectionItem,
  BreadcrumbItemProps,
  BreadcrumbLinkProps,
  BreadcrumbSeparatorProps,
  BreadcrumbsProps,
} from "./breadcrumbs.types";
export { BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, Breadcrumbs };
