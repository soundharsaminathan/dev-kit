import { cn, composeRefs } from "@dev-ui/core";
import { Icon } from "@dev-ui/icons";
import { useFocusRing } from "@react-aria/focus";
import { useHover } from "@react-aria/interactions";
import type { AriaMenuOptions } from "@react-aria/menu";
import { useMenu, useMenuItem, useMenuTrigger } from "@react-aria/menu";
import { OverlayContainer } from "@react-aria/overlays";
import { mergeProps } from "@react-aria/utils";
import { useMenuTriggerState } from "@react-stately/menu";
import { useTreeState } from "@react-stately/tree";
import type { Node } from "@react-types/shared";
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useMemo,
  useRef,
} from "react";
import {
  type CollectionItem,
  findChildByDisplayName,
  getCollectionChild,
  getDisabledKeys,
  parseCollectionItems,
} from "../list-box/collection-utils";
import { Popover, PopoverProvider } from "../popover/Popover";
import styles from "./menu.module.scss";
import type {
  MenuContentProps,
  MenuItemContextValue,
  MenuItemDescriptionProps,
  MenuItemLabelProps,
  MenuItemProps,
  MenuProps,
  MenuSectionHeaderProps,
  MenuSectionProps,
} from "./menu.types";
import { MenuContext, useMenuContext } from "./menu-context";

const MenuItemContext = createContext<MenuItemContextValue | null>(null);

function getTriggerChild(children: ReactNode, contentDisplayName: string) {
  let found: ReactElement | null = null;
  Children.forEach(children, (child) => {
    if (found || !isValidElement(child)) {
      return;
    }
    const type = child.type as { displayName?: string };
    if (type.displayName !== contentDisplayName) {
      found = child as ReactElement;
    }
  });
  return found;
}

function Menu({ children, className, ...props }: MenuProps) {
  const triggerRef = useRef<Element>(null);
  const menuRef = useRef<HTMLElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const contentChild = findChildByDisplayName(children, "MenuContent");

  const itemsList = useMemo((): CollectionItem[] => {
    if (contentChild) {
      return parseCollectionItems(
        (contentChild.props as { children?: ReactNode }).children,
        "MenuItem",
      );
    }
    return [];
  }, [contentChild]);

  const overlayState = useMenuTriggerState(props);
  const { menuTriggerProps, menuProps } = useMenuTrigger(
    props,
    overlayState,
    triggerRef,
  );

  const triggerChild = getTriggerChild(children, "MenuContent");

  const contextValue = useMemo(
    () => ({
      overlayState,
      triggerRef,
      menuTriggerProps,
      menuProps: menuProps as AriaMenuOptions<CollectionItem>,
      menuRef,
      popoverRef,
      itemsList,
    }),
    [overlayState, menuTriggerProps, menuProps, itemsList],
  );

  const renderedTrigger = triggerChild
    ? cloneElement(
        triggerChild as ReactElement<Record<string, unknown>>,
        mergeProps(
          (triggerChild as ReactElement).props as Record<string, unknown>,
          menuTriggerProps,
          {
            ref: composeRefs(
              triggerRef,
              (
                (triggerChild as ReactElement).props as {
                  ref?: React.Ref<Element>;
                }
              ).ref,
            ),
          },
        ),
      )
    : null;

  return (
    <MenuContext.Provider value={contextValue}>
      <PopoverProvider
        value={{
          triggerRef,
          popoverRef,
          state: overlayState,
        }}
      >
        <div data-menu="" className={className}>
          {renderedTrigger}
          {contentChild}
        </div>
      </PopoverProvider>
    </MenuContext.Provider>
  );
}

function MenuContent<T extends CollectionItem>({
  className,
  placement,
  portalContainer,
  ...props
}: MenuContentProps<T>) {
  const {
    overlayState,
    menuProps,
    menuRef,
    itemsList,
    portalContainer: contextPortalContainer,
  } = useMenuContext("MenuContent");
  const resolvedPortalContainer = portalContainer ?? contextPortalContainer;

  const treeState = useTreeState({
    ...menuProps,
    ...props,
    items: itemsList as Iterable<T>,
    disabledKeys: getDisabledKeys(itemsList),
    children: getCollectionChild,
  });

  const { onAction: onActionProp, ...restProps } = props;
  const { menuProps: listProps } = useMenu(
    {
      ...menuProps,
      ...restProps,
      onAction: (key) => {
        onActionProp?.(key);
        overlayState.close();
      },
    },
    treeState,
    menuRef,
  );
  const selectionMode = treeState.selectionManager.selectionMode;

  if (!overlayState.isOpen) {
    return null;
  }

  return (
    <OverlayContainer
      {...(resolvedPortalContainer != null
        ? { portalContainer: resolvedPortalContainer }
        : {})}
    >
      <Popover
        placement={placement}
        {...(resolvedPortalContainer != null
          ? { portalContainer: resolvedPortalContainer }
          : {})}
      >
        <ul
          {...listProps}
          ref={menuRef as React.Ref<HTMLUListElement>}
          data-menu-content=""
          className={cn(styles.list, className)}
        >
          {renderCollectionItems(treeState, selectionMode)}
        </ul>
      </Popover>
    </OverlayContainer>
  );
}
MenuContent.displayName = "MenuContent";

function renderCollectionItems(
  state: ReturnType<typeof useTreeState<CollectionItem>>,
  selectionMode: "single" | "multiple" | "none",
) {
  return [...state.collection].map((item) => {
    if (item.type === "item") {
      const value = item.value as CollectionItem;
      return (
        <MenuItemRenderer
          key={item.key}
          item={item}
          state={state}
          variant={value.variant}
          selectionMode={selectionMode}
        >
          {value.label}
        </MenuItemRenderer>
      );
    }
    return null;
  });
}

function MenuItemRenderer({
  item,
  children,
  className,
  variant,
  selectionMode = "none",
  state,
}: {
  item: Node<CollectionItem>;
  children: ReactNode;
  className?: string | undefined;
  variant?: "default" | "danger" | undefined;
  selectionMode: "single" | "multiple" | "none";
  state: ReturnType<typeof useTreeState<CollectionItem>>;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const { menuItemProps, isSelected, isFocused, isDisabled } = useMenuItem(
    { key: item.key },
    state,
    ref,
  );
  const { hoverProps, isHovered } = useHover({ isDisabled });
  const { focusProps, isFocusVisible } = useFocusRing();

  const itemContext: MenuItemContextValue = {
    item,
    isSelected,
    isDisabled,
    isFocused,
    isFocusVisible,
    isHovered,
    selectionMode,
    variant,
  };

  return (
    <MenuItemContext.Provider value={itemContext}>
      <li
        {...mergeProps(menuItemProps, hoverProps, focusProps)}
        ref={ref}
        data-menu-item=""
        data-variant={variant}
        data-selected={isSelected ? "true" : undefined}
        data-disabled={isDisabled ? "true" : undefined}
        data-hovered={isHovered ? "true" : undefined}
        data-focused={isFocused ? "true" : undefined}
        data-focus-visible={isFocusVisible ? "true" : undefined}
        data-selection-mode={selectionMode}
        className={cn(styles.item, className)}
      >
        {typeof children === "string" ? (
          <MenuItemLabel>{children}</MenuItemLabel>
        ) : (
          children
        )}
        {selectionMode !== "none" && isSelected ? (
          <span data-menu-item-indicator="" className={styles.indicator}>
            <Icon name="check" className={styles.checkIcon} />
          </span>
        ) : null}
      </li>
    </MenuItemContext.Provider>
  );
}

function MenuItem({
  id: _id,
  textValue: _textValue,
  isDisabled: _isDisabled,
  variant: _variant,
  children: _children,
  className: _className,
}: MenuItemProps) {
  return null;
}
MenuItem.displayName = "MenuItem";

function MenuItemLabel({ className, ...props }: MenuItemLabelProps) {
  return (
    <span
      data-menu-item-label=""
      className={cn(styles.itemLabel, className)}
      {...props}
    />
  );
}

function MenuItemDescription({
  className,
  ...props
}: MenuItemDescriptionProps) {
  return (
    <span
      data-menu-item-description=""
      className={cn(styles.itemDescription, className)}
      {...props}
    />
  );
}

function MenuSection({ title, children, className }: MenuSectionProps) {
  return (
    <li data-menu-section="" className={cn(styles.section, className)}>
      {title ? <MenuSectionHeader>{title}</MenuSectionHeader> : null}
      {/* biome-ignore lint/a11y/useSemanticElements: section subgroup for menu items */}
      <ul role="group">{children}</ul>
    </li>
  );
}
MenuSection.displayName = "MenuSection";

function MenuSectionHeader({ className, ...props }: MenuSectionHeaderProps) {
  return (
    <div
      data-menu-section-header=""
      className={cn(styles.sectionHeader, className)}
      {...props}
    />
  );
}

export type {
  MenuContentProps,
  MenuItemDescriptionProps,
  MenuItemLabelProps,
  MenuItemProps,
  MenuProps,
  MenuSectionHeaderProps,
  MenuSectionProps,
} from "./menu.types";
export {
  Menu,
  MenuContent,
  MenuItem,
  MenuItemDescription,
  MenuItemLabel,
  MenuSection,
  MenuSectionHeader,
};
