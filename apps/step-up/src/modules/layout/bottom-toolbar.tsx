import { useIsMobile } from "@dev-ui/hooks";
import { Icon } from "@dev-ui/icons";
import { Link, useRouterState } from "@tanstack/react-router";
import { motion, type Transition, useReducedMotion } from "motion/react";
import { useAuth } from "@/lib/auth";
import {
  TooltipIconBar,
  TooltipIconBarItem,
} from "@/modules/ui/tooltip-icon-bar";
import styles from "./bottom-toolbar.module.scss";
import {
  getMoreLinks,
  getPrimaryTabs,
  getProfilePath,
  type NavLinkItem,
  type ShellVariant,
} from "./nav-config";
import { useNavEnabledFeatures } from "./use-nav-enabled-features";

const SPRING_TAB_BUBBLE = {
  type: "spring",
  stiffness: 360,
  damping: 32,
  mass: 0.6,
} as const satisfies Transition;

const TAB_BUBBLE_LAYOUT_ID = "member-tab-bubble";

type BottomToolbarProps = {
  variant: ShellVariant;
};

function isLinkActive(pathname: string, link: NavLinkItem) {
  if (link.exact) {
    return pathname === link.to;
  }
  return pathname === link.to || pathname.startsWith(`${link.to}/`);
}

function TabBubble() {
  const reducedMotion = useReducedMotion();
  return (
    <motion.span
      layoutId={TAB_BUBBLE_LAYOUT_ID}
      className={styles.tabBubble}
      transition={reducedMotion ? { duration: 0 } : SPRING_TAB_BUBBLE}
      aria-hidden
    />
  );
}

function ToolbarLink({
  link,
  bubble,
  extraActive = false,
}: {
  link: NavLinkItem;
  bubble: boolean;
  extraActive?: boolean;
}) {
  const { to, label, icon, exact } = link;
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const active = isLinkActive(pathname, link) || extraActive;
  const itemClassName = styles.toolbarItem;
  const tabClassName = active
    ? `${styles.tab} ${styles.tabActive}`
    : styles.tab;

  return (
    <TooltipIconBarItem
      label={label}
      {...(itemClassName ? { className: itemClassName } : {})}
    >
      <Link
        to={to}
        className={tabClassName}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        activeOptions={{ exact: exact ?? false }}
      >
        {bubble && active ? <TabBubble /> : null}
        <Icon name={icon} className={styles.tabIcon} />
      </Link>
    </TooltipIconBarItem>
  );
}

export function BottomToolbar({ variant }: BottomToolbarProps) {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const enabledFeatures = useNavEnabledFeatures(variant);
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const primary = getPrimaryTabs(variant, user?.role, enabledFeatures);
  const moreLinks = getMoreLinks(variant, user?.role, enabledFeatures);
  const moreActive = moreLinks.some((link) => isLinkActive(pathname, link));
  const profilePath = getProfilePath(variant);
  const memberChrome = variant === "me";

  return (
    <TooltipIconBar
      placement="top"
      disabled={isMobile}
      className={
        memberChrome
          ? `${styles.toolbar} ${styles.toolbarMember}`
          : (styles.toolbar ?? "")
      }
      itemsClassName={styles.toolbarItems ?? ""}
      aria-label="Primary"
    >
      {primary.map((link) => (
        <ToolbarLink
          key={link.to}
          link={link}
          bubble={memberChrome}
          extraActive={link.to === profilePath && moreActive}
        />
      ))}
    </TooltipIconBar>
  );
}
