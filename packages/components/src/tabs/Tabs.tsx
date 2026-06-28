import { cn, composeRefs } from "@dev-ui/core";
import { useFocusRing } from "@react-aria/focus";
import { useHover } from "@react-aria/interactions";
import { useTab, useTabList, useTabPanel } from "@react-aria/tabs";
import { mergeProps } from "@react-aria/utils";
import { useTabListState } from "@react-stately/tabs";
import { type HTMLMotionProps, motion } from "motion/react";
import {
  createContext,
  isValidElement,
  type ReactNode,
  useContext,
  useId,
  useMemo,
  useRef,
} from "react";
import {
  findChildByDisplayName,
  getCollectionChild,
  getDisabledKeys,
  parseCollectionItems,
} from "../list-box/collection-utils";
import { LayoutIndicator } from "../motion/LayoutIndicator";
import styles from "./tabs.module.scss";
import type {
  TabListContextValue,
  TabListProps,
  TabPanelProps,
  TabProps,
  TabsContextValue,
  TabsProps,
} from "./tabs.types";

const TabsContext = createContext<TabsContextValue | null>(null);
const TabListContext = createContext<TabListContextValue | null>(null);

function useTabsContext(component: string): TabsContextValue {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error(`${component} must be used within Tabs`);
  }
  return context;
}

function useTabListContext(component: string): TabListContextValue {
  const context = useContext(TabListContext);
  if (!context) {
    throw new Error(`${component} must be used within TabList`);
  }
  return context;
}

function Tabs<T extends object>({
  children,
  className,
  orientation = "horizontal",
  ref: _ref,
  ...stateProps
}: TabsProps<T>) {
  const hasTabList = useMemo(
    () => Boolean(findChildByDisplayName(children, "TabList")),
    [children],
  );
  const tabItems = useMemo(() => {
    const tabList = findChildByDisplayName(children, "TabList");
    if (tabList && isValidElement(tabList)) {
      const tabListChildren = (tabList.props as { children?: ReactNode })
        .children;
      return parseCollectionItems(tabListChildren, "Tab");
    }
    return parseCollectionItems(children, "TabPanel");
  }, [children]);

  const state = useTabListState({
    ...stateProps,
    items: tabItems,
    disabledKeys: getDisabledKeys(tabItems),
    children: (item) => getCollectionChild(item),
  });

  const contextValue = useMemo(
    () => ({
      state: state as TabsContextValue["state"],
      orientation,
    }),
    [state, orientation],
  );

  return (
    <TabsContext.Provider value={contextValue}>
      <div
        data-tabs=""
        data-orientation={orientation}
        className={cn(styles.root, className)}
      >
        {!hasTabList && tabItems.length > 0 ? (
          <TabList
            aria-hidden="true"
            className={styles.hiddenTabList}
            data-hidden-tab-list=""
          >
            {tabItems.map((item) => (
              <Tab key={String(item.id)} id={item.id}>
                {String(item.id)}
              </Tab>
            ))}
          </TabList>
        ) : null}
        {children}
      </div>
    </TabsContext.Provider>
  );
}

function TabList({
  children,
  className,
  variant = "default",
  ref,
  ...props
}: TabListProps) {
  const { state, orientation } = useTabsContext("TabList");
  const tabListRef = useRef<HTMLDivElement>(null);
  const layoutId = useId();
  const { tabListProps } = useTabList({ orientation }, state, tabListRef);
  const listContext = useMemo(
    () => ({ variant, layoutId }),
    [variant, layoutId],
  );

  return (
    <TabListContext.Provider value={listContext}>
      <motion.div
        layoutRoot
        {...(mergeProps(
          tabListProps,
          props,
        ) as unknown as HTMLMotionProps<"div">)}
        ref={composeRefs(tabListRef, ref)}
        data-tab-list=""
        data-orientation={orientation}
        data-variant={variant}
        className={cn(styles.list, className)}
      >
        {children}
      </motion.div>
    </TabListContext.Provider>
  );
}
TabList.displayName = "TabList";

function Tab({ id, children, className, isDisabled, ref }: TabProps) {
  const { state, orientation } = useTabsContext("Tab");
  const { variant, layoutId } = useTabListContext("Tab");
  const tabRef = useRef<HTMLDivElement>(null);
  const {
    tabProps,
    isSelected,
    isDisabled: isTabDisabled,
  } = useTab(
    {
      key: id,
      ...(isDisabled !== undefined ? { isDisabled } : {}),
    },
    state,
    tabRef,
  );
  const { hoverProps, isHovered } = useHover({
    isDisabled: isTabDisabled,
  });
  const { focusProps, isFocusVisible } = useFocusRing();

  return (
    <div
      {...mergeProps(tabProps, hoverProps, focusProps)}
      ref={composeRefs(tabRef, ref)}
      data-tab=""
      data-orientation={orientation}
      data-variant={variant}
      data-selected={isSelected ? "true" : undefined}
      data-hovered={isHovered ? "true" : undefined}
      data-disabled={isTabDisabled ? "true" : undefined}
      data-focus-visible={isFocusVisible ? "true" : undefined}
      className={cn(styles.tab, className)}
    >
      {isSelected ? (
        <LayoutIndicator
          layoutId={layoutId}
          className={styles.selectionIndicator}
        />
      ) : null}
      <span data-tab-content="" className={styles.tabContent}>
        {children}
      </span>
    </div>
  );
}
Tab.displayName = "Tab";

function TabPanel({ id, children, className, ref }: TabPanelProps) {
  const { state } = useTabsContext("TabPanel");
  const panelRef = useRef<HTMLDivElement>(null);
  const { tabPanelProps } = useTabPanel({ id }, state, panelRef);
  const isSelected = state.selectedKey === id;

  return (
    <div
      {...tabPanelProps}
      ref={composeRefs(panelRef, ref)}
      data-tab-panel=""
      data-inert={isSelected ? undefined : "true"}
      className={cn(styles.panel, className)}
    >
      {children}
    </div>
  );
}
TabPanel.displayName = "TabPanel";

export type {
  TabListProps,
  TabPanelProps,
  TabProps,
  TabsProps,
} from "./tabs.types";
export { Tab, TabList, TabPanel, Tabs };
