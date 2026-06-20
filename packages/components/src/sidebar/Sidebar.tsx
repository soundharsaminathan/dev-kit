import { cn } from "@dev-ui/core";
import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
} from "react";
import { useKeyboardShortcut } from "../hooks/use-keyboard-shortcut";
import { Tooltip, TooltipContent } from "../tooltip/Tooltip";
import styles from "./sidebar.module.scss";
import type {
  SidebarContextValue,
  SidebarItemProps,
  SidebarProps,
  SidebarProviderProps,
  SidebarSectionContextValue,
  SidebarTooltipProps,
} from "./sidebar.types";

const SIDEBAR_WIDTH = "15rem";
const SIDEBAR_WIDTH_ICON = "3rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

const SidebarContext = createContext<SidebarContextValue | null>(null);
const SidebarSectionContext = createContext<SidebarSectionContextValue | null>(
  null,
);

function useSidebarContext(component: string): SidebarContextValue {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error(`${component} must be used within SidebarProvider`);
  }
  return context;
}

function useControllableOpen(
  value: boolean | undefined,
  defaultValue: boolean,
  onChange?: (open: boolean) => void,
) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const isControlled = value !== undefined;
  const isOpen = isControlled ? value : uncontrolled;

  const setOpen = useCallback(
    (open: boolean) => {
      if (!isControlled) {
        setUncontrolled(open);
      }
      onChange?.(open);
    },
    [isControlled, onChange],
  );

  return [isOpen, setOpen] as const;
}

function PanelLeftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={styles.panelLeftIcon}
    >
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M9 3v18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SidebarProvider({
  defaultOpen = true,
  isOpen: isOpenProp,
  onOpenChange,
  className,
  style,
  children,
  ...props
}: SidebarProviderProps) {
  const [isOpen, setOpen] = useControllableOpen(
    isOpenProp,
    defaultOpen,
    onOpenChange,
  );

  const toggleSidebar = useCallback(() => {
    setOpen(!isOpen);
  }, [isOpen, setOpen]);

  useKeyboardShortcut({
    key: SIDEBAR_KEYBOARD_SHORTCUT,
    metaKey: true,
    onPress: toggleSidebar,
  });

  const contextValue = useMemo(
    () => ({
      isOpen,
      setOpen,
      toggleSidebar,
    }),
    [isOpen, setOpen, toggleSidebar],
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      <div
        data-sidebar-wrapper=""
        style={
          {
            "--sidebar-width": SIDEBAR_WIDTH,
            "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
            ...style,
          } as React.CSSProperties
        }
        className={cn(styles.wrapper, className)}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

function Sidebar({
  className,
  placement = "left",
  children,
  ...props
}: SidebarProps) {
  const { isOpen } = useSidebarContext("Sidebar");
  const headingId = useId();

  return (
    <div
      className={styles.root}
      data-expanded={isOpen ? "true" : undefined}
      data-placement={placement}
      data-sidebar=""
    >
      <div className={styles.gap} aria-hidden="true" />
      <div data-sidebar-container="" className={styles.container} {...props}>
        <nav
          data-sidebar-inner=""
          className={cn(styles.inner, className)}
          aria-labelledby={headingId}
        >
          <span id={headingId} hidden>
            Sidebar
          </span>
          {children}
        </nav>
      </div>
    </div>
  );
}

function SidebarHeader({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"header">) {
  return (
    <header
      data-sidebar-header=""
      className={cn(styles.header, className)}
      {...props}
    />
  );
}

function SidebarContent({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-sidebar-content=""
      data-sidebar="content"
      className={cn(styles.content, className)}
      {...props}
    />
  );
}

function SidebarFooter({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-sidebar-footer=""
      className={cn(styles.footer, className)}
      {...props}
    />
  );
}

function SidebarSection({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"section">) {
  const headingId = useId();
  const sectionContext = useMemo(() => ({ headingId }), [headingId]);

  return (
    <SidebarSectionContext.Provider value={sectionContext}>
      <section
        data-sidebar-section=""
        aria-labelledby={headingId}
        className={cn(styles.section, className)}
        {...props}
      />
    </SidebarSectionContext.Provider>
  );
}

function SidebarSectionHeading({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const section = useContext(SidebarSectionContext);

  return (
    <div
      id={section?.headingId}
      data-sidebar-section-heading=""
      className={cn(styles.heading, className)}
      {...props}
    />
  );
}

function SidebarList({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"ul">) {
  return (
    <ul
      data-sidebar-list=""
      className={cn(styles.list, className)}
      {...props}
    />
  );
}

function SidebarItem({
  tooltip,
  className,
  children,
  ...props
}: SidebarItemProps) {
  const { isOpen } = useSidebarContext("SidebarItem");

  const content = tooltip ? (
    <Tooltip isDisabled={isOpen} delay={0}>
      {children}
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  ) : (
    children
  );

  return (
    <li data-sidebar-item="" className={cn(styles.item, className)} {...props}>
      {content}
    </li>
  );
}

function SidebarTooltip({ content, children }: SidebarTooltipProps) {
  const { isOpen } = useSidebarContext("SidebarTooltip");

  return (
    <Tooltip isDisabled={isOpen} delay={0}>
      {children}
      <TooltipContent placement="right">{content}</TooltipContent>
    </Tooltip>
  );
}

export type {
  SidebarContextValue,
  SidebarItemProps,
  SidebarPlacement,
  SidebarProps,
  SidebarProviderProps,
  SidebarTooltipProps,
} from "./sidebar.types";
export {
  PanelLeftIcon,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarList,
  SidebarProvider,
  SidebarSection,
  SidebarSectionHeading,
  SidebarTooltip,
  useSidebarContext,
};
