import { Icon } from "@dev-ui/icons";
import { Link, useRouterState } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import type { FeatureKey } from "@/lib/feature-keys";
import { isFeatureEnabled, useStudioFeatures } from "@/lib/studio-features";
import { InstallAppPanel } from "@/modules/pwa/install-app-panel";
import { TouchButton } from "@/modules/ui/touch-button";
import {
  filterSettingsNav,
  findSettingsNavItem,
  SETTINGS_NAV,
  SETTINGS_PAGE_META,
  type SettingsNavGroup,
  type SettingsNavItem,
} from "../settings-nav";
import {
  SettingsHeaderContext,
  type SettingsHeaderRegistration,
} from "./settings-header";
import styles from "./settings-ui.module.scss";

function SettingsNavList({
  groups,
  pathname,
  onNavigate,
  className,
  orientation = "vertical",
}: {
  groups: SettingsNavGroup[];
  pathname: string;
  onNavigate?: (() => void) | undefined;
  className?: string | undefined;
  orientation?: "vertical" | "horizontal";
}) {
  return (
    <nav
      className={className ?? styles.nav}
      aria-label="Settings"
      data-orientation={orientation}
    >
      {groups.map((group) => (
        <div key={group.id} className={styles.navGroup}>
          <p className={styles.navGroupLabel}>{group.label}</p>
          <ul className={styles.navList}>
            {group.items.map((item) => (
              <li key={item.id}>
                <NavItemLink
                  item={item}
                  pathname={pathname}
                  onNavigate={onNavigate}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function NavItemLink({
  item,
  pathname,
  onNavigate,
}: {
  item: SettingsNavItem;
  pathname: string;
  onNavigate?: (() => void) | undefined;
}) {
  const active = pathname === item.to || pathname.startsWith(`${item.to}/`);

  return (
    <Link
      to={item.to}
      className={styles.navLink}
      data-active={active ? "true" : undefined}
      data-coming-soon={item.kind === "comingSoon" ? "true" : undefined}
      onClick={() => onNavigate?.()}
    >
      <span className={styles.navIcon} aria-hidden>
        <Icon name={item.icon} />
      </span>
      <span>{item.label}</span>
      {item.kind === "comingSoon" ? (
        <span className={styles.navBadge}>Soon</span>
      ) : null}
    </Link>
  );
}

type SettingsLayoutProps = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  paddedSave?: boolean;
};

export function SettingsLayout({
  children,
  title,
  subtitle,
  paddedSave = false,
}: SettingsLayoutProps) {
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [header, setHeader] = useState<SettingsHeaderRegistration | null>(null);

  const isOwner = user?.role === "OWNER";
  const isAdmin = user?.role === "OWNER" || user?.role === "STAFF";
  const isWorkspace =
    pathname === "/app/settings/profile" ||
    pathname.startsWith("/app/settings/profile/") ||
    pathname === "/app/settings/branding" ||
    pathname.startsWith("/app/settings/branding/");

  const featuresQuery = useStudioFeatures();
  const features = featuresQuery.data?.features;
  const featuresReady = !featuresQuery.isLoading && !featuresQuery.isPending;

  const groups = useMemo(
    () =>
      filterSettingsNav(SETTINGS_NAV, {
        isOwner,
        isAdmin,
        isFeatureEnabled: (key: FeatureKey) =>
          featuresReady && isFeatureEnabled(features, key),
      }),
    [isOwner, isAdmin, featuresReady, features],
  );

  const activeItem = findSettingsNavItem(pathname, groups);
  const meta = SETTINGS_PAGE_META[pathname];
  const pageTitle = title ?? meta?.title ?? activeItem?.label ?? "Settings";
  const pageSubtitle =
    subtitle ?? meta?.subtitle ?? "Manage your studio configuration.";

  return (
    <SettingsHeaderContext.Provider value={setHeader}>
      <div
        className={styles.layout}
        data-workspace={isWorkspace ? "true" : undefined}
      >
        <header className={styles.pageHeader}>
          <div className={styles.pageHeaderStart}>
            <Link to="/app" className={styles.back} aria-label="Back to home">
              <Icon name="arrow-left" />
            </Link>
            <div className={styles.pageHeaderCopy}>
              <h1 className={styles.pageTitle}>{pageTitle}</h1>
              <p className={styles.pageSubtitle}>{pageSubtitle}</p>
            </div>
          </div>
          <div className={styles.pageHeaderEnd}>
            {header?.dirty ? (
              <span className={styles.unsaved}>Unsaved changes</span>
            ) : null}
            {header?.onSave ? (
              <TouchButton
                variant="primary"
                size="sm"
                isPending={header.pending}
                isDisabled={!header.dirty || header.pending}
                onClick={header.onSave}
              >
                {header.saveLabel ?? "Save changes"}
              </TouchButton>
            ) : null}
          </div>
        </header>

        <div className={styles.frame}>
          <aside className={styles.navRail}>
            <SettingsNavList groups={groups} pathname={pathname} />
            <div className={styles.navFooter}>
              <InstallAppPanel />
            </div>
          </aside>

          <div
            className={[styles.main, paddedSave ? styles.contentPaddedSave : ""]
              .filter(Boolean)
              .join(" ")}
          >
            <SettingsNavList
              groups={groups}
              pathname={pathname}
              className={styles.navScroller}
              orientation="horizontal"
            />

            {children}
          </div>
        </div>
      </div>
    </SettingsHeaderContext.Provider>
  );
}
