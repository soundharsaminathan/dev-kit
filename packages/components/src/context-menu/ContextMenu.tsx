import { cn } from "@dev-ui/core";
import { useMenuTrigger } from "@react-aria/menu";
import { useMenuTriggerState } from "@react-stately/menu";
import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useMemo,
  useRef,
} from "react";
import {
  findChildByDisplayName,
  parseCollectionItems,
} from "../list-box/collection-utils";
import type { MenuContextValue } from "../menu/menu.types";
import { MenuContext } from "../menu/menu-context";
import { PopoverProvider } from "../popover/Popover";
import styles from "./context-menu.module.scss";
import type { ContextMenuProps } from "./context-menu.types";
import { useContextMenuTrigger } from "./use-context-menu-trigger";

function getNonContentChildren(
  children: ReactNode,
  contentDisplayName: string,
): ReactNode {
  const nodes: ReactNode[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) {
      nodes.push(child);
      return;
    }
    const type = child.type as { displayName?: string };
    if (type.displayName === contentDisplayName) {
      return;
    }
    nodes.push(child);
  });
  return nodes;
}

function ContextMenu({
  children,
  defaultOpen,
  isOpen,
  isDisabled = false,
  onContextMenu,
  onOpenChange,
  "aria-label": ariaLabel = "Context menu",
  className,
  ...triggerProps
}: ContextMenuProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const contentChild = findChildByDisplayName(children, "MenuContent");
  const overlayState = useMenuTriggerState({
    ...(defaultOpen !== undefined ? { defaultOpen } : {}),
    ...(isOpen !== undefined ? { isOpen } : {}),
    ...(onOpenChange !== undefined ? { onOpenChange } : {}),
  });
  const contextMenu = useContextMenuTrigger({
    state: overlayState,
    isDisabled,
    onContextMenu,
    triggerProps,
  });
  const { menuProps } = useMenuTrigger(
    { type: "menu" },
    overlayState,
    contextMenu.triggerRef,
  );

  const itemsList = useMemo(() => {
    if (contentChild) {
      return parseCollectionItems(
        (contentChild.props as { children?: ReactNode }).children,
        "MenuItem",
      );
    }
    return [];
  }, [contentChild]);

  const contextValue = useMemo(
    (): MenuContextValue => ({
      overlayState,
      triggerRef: contextMenu.triggerRef,
      menuTriggerProps: contextMenu.triggerProps,
      menuProps: {
        ...menuProps,
        "aria-label": ariaLabel,
        autoFocus: overlayState.focusStrategy ?? true,
      } as MenuContextValue["menuProps"],
      menuRef: contextMenu.menuRef,
      popoverRef,
      itemsList,
    }),
    [
      overlayState,
      contextMenu.triggerRef,
      contextMenu.triggerProps,
      contextMenu.menuRef,
      menuProps,
      ariaLabel,
      itemsList,
    ],
  );

  const renderedContent = contentChild
    ? cloneElement(contentChild as ReactElement<{ placement?: string }>, {
        placement: "bottom start",
      })
    : null;

  return (
    <MenuContext.Provider value={contextValue}>
      <PopoverProvider
        value={{
          triggerRef: contextMenu.anchorRef,
          popoverRef,
          state: overlayState,
          placement: "bottom start",
          isNonModal: true,
        }}
      >
        <div
          {...contextMenu.triggerProps}
          data-context-menu=""
          data-disabled={isDisabled ? "" : undefined}
          ref={contextMenu.triggerRef}
          className={cn(styles.trigger, className)}
        >
          {getNonContentChildren(children, "MenuContent")}
        </div>
        <span
          key={contextMenu.anchor.key}
          ref={contextMenu.anchorRefCallback}
          aria-hidden="true"
          className={styles.anchor}
          style={{
            width: contextMenu.anchor.size,
            height: contextMenu.anchor.size,
          }}
        />
        {renderedContent}
      </PopoverProvider>
    </MenuContext.Provider>
  );
}

export type { ContextMenuProps } from "./context-menu.types";
export { ContextMenu };
