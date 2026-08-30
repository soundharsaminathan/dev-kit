import { Icon } from "@dev-ui/icons";
import { Link, useRouterState } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import type { FeatureKey } from "@/lib/feature-keys";
import { isFeatureEnabled, useStudioFeatures } from "@/lib/studio-features";
import { InstallAppPanel } from "@/modules/pwa/install-app-panel";
import { AppBottomSheet } from "@/modules/ui/app-bottom-sheet";
import {
  filterSettingsNav,
  findSettingsNavItem,
  SETTINGS_NAV,
  SETTINGS_PAGE_META,
  type SettingsNavGroup,
  type SettingsNavItem,
} from "../settings-nav";
import styles from "./settings-ui.module.scss";

function SettingsNavList({
  groups,
  pathname,
  onNavigate,
  className,
}: {
  groups: SettingsNavGroup[];
  pathname: string;
  onNavigate?: (() => void) | undefined;
  className?: string | undefined;
}) {
  return (
    <nav className={className ?? styles.nav} aria-label="Settings">
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
  const [sheetOpen, setSheetOpen] = useState(false);

  const isOwner = user?.role === "OWNER";
  const isAdmin = user?.role === "OWNER" || user?.role === "STAFF";

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
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <SettingsNavList groups={groups} pathname={pathname} />
        <div className={styles.navFooter}>
          <InstallAppPanel />
        </div>
      </aside>

      <div
        className={[styles.content, paddedSave ? styles.contentPaddedSave : ""]
          .filter(Boolean)
          .join(" ")}
      >
        <button
          type="button"
          className={styles.mobileTrigger}
          onClick={() => setSheetOpen(true)}
        >
          <span className={styles.mobileTriggerMeta}>
            <span>Settings</span>
            <span className={styles.mobileTriggerHint}>
              {activeItem?.label ?? pageTitle}
            </span>
          </span>
          <Icon name="chevron-down" className={styles.mobileTriggerChevron} />
        </button>

        <header className={styles.contentHeader}>
          <h1 className={styles.contentTitle}>{pageTitle}</h1>
          <p className={styles.contentSubtitle}>{pageSubtitle}</p>
        </header>

        {children}
      </div>

      <AppBottomSheet
        isOpen={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Settings"
        size="tall"
      >
        <SettingsNavList
          groups={groups}
          pathname={pathname}
          onNavigate={() => setSheetOpen(false)}
          className={styles.sheetNav}
        />
        <InstallAppPanel />
      </AppBottomSheet>
    </div>
  );
}
