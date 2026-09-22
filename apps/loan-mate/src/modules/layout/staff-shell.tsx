import { Button } from "@dev-ui/components/button";
import {
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
  useSidebarContext,
} from "@dev-ui/components/sidebar";
import { Icon, type IconName } from "@dev-ui/icons";
import { Link, useRouterState } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import styles from "./shell.module.scss";

const MOBILE_NAV_QUERY = "(max-width: 767px)";

export type NavItem = {
  to: string;
  label: string;
  icon: IconName;
  exact?: boolean;
};

type StaffShellProps = {
  subtitle: string;
  navLabel: string;
  items: readonly NavItem[];
  children: ReactNode;
};

function SidebarToggle() {
  const { toggleSidebar } = useSidebarContext("SidebarToggle");
  return (
    <Button
      variant="quiet"
      isIconOnly
      aria-label="Toggle sidebar"
      onClick={toggleSidebar}
    >
      <PanelLeftIcon />
    </Button>
  );
}

function NavLinks({
  items,
  navLabel,
  onNavigate,
}: {
  items: readonly NavItem[];
  navLabel?: string;
  onNavigate?: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const list = (
    <SidebarSection>
      {navLabel ? (
        <SidebarSectionHeading>{navLabel}</SidebarSectionHeading>
      ) : null}
      <SidebarList>
        {items.map((item) => {
          const active = item.exact
            ? pathname === item.to
            : pathname === item.to || pathname.startsWith(`${item.to}/`);
          return (
            <SidebarItem key={item.to} tooltip={item.label}>
              <Link
                to={item.to}
                activeOptions={{ exact: Boolean(item.exact) }}
                className={active ? styles.linkActive : styles.link}
                aria-label={item.label}
                onClick={onNavigate}
              >
                <Icon name={item.icon} className={styles.navIcon} />
                <span data-sidebar-label="">{item.label}</span>
              </Link>
            </SidebarItem>
          );
        })}
      </SidebarList>
    </SidebarSection>
  );

  if (onNavigate) {
    return <nav aria-label={navLabel}>{list}</nav>;
  }

  return list;
}

export function StaffShell({
  subtitle,
  navLabel,
  items,
  children,
}: StaffShellProps) {
  const { user, logout } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(MOBILE_NAV_QUERY);
    const sync = () => setMobile(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [drawerOpen]);

  const showDrawer = mobile && drawerOpen;

  return (
    <SidebarProvider
      isOpen={sidebarOpen}
      onOpenChange={setSidebarOpen}
      className={styles.shell}
    >
      <div className={styles.sidebarWrap}>
        <Sidebar placement="left">
          <SidebarHeader>
            <div className={styles.brand}>
              <span className={styles.mark} aria-hidden>
                <Icon name="wallet" />
              </span>
              <div data-sidebar-label="">
                <strong>loan-mate</strong>
                <p>{subtitle}</p>
              </div>
            </div>
            <SidebarToggle />
          </SidebarHeader>
          <SidebarContent>
            <NavLinks items={items} navLabel={navLabel} />
          </SidebarContent>
          <SidebarFooter>
            <div className={styles.user} data-sidebar-label="">
              <strong>{user?.name}</strong>
              <span>{user?.role.replaceAll("_", " ")}</span>
            </div>
            <Button variant="outline" onClick={logout}>
              <Icon name="log-out" />
              <span data-sidebar-label="">Sign out</span>
            </Button>
          </SidebarFooter>
        </Sidebar>
      </div>

      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <Button
            variant="quiet"
            isIconOnly
            aria-expanded={showDrawer}
            aria-controls="staff-drawer"
            aria-label={showDrawer ? "Close menu" : "Open menu"}
            onClick={() => setDrawerOpen((value) => !value)}
          >
            <Icon name={showDrawer ? "x" : "menu"} />
          </Button>
          <div className={styles.brand}>
            <span className={styles.mark} aria-hidden>
              <Icon name="wallet" />
            </span>
            <div>
              <strong>loan-mate</strong>
              <p>{subtitle}</p>
            </div>
          </div>
        </header>
        {showDrawer ? (
          <button
            type="button"
            className={styles.backdrop}
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
          />
        ) : null}
        <aside
          id="staff-drawer"
          className={styles.drawer}
          data-open={showDrawer ? "true" : "false"}
          inert={mobile && !drawerOpen ? true : undefined}
        >
          <NavLinks
            items={items}
            navLabel={navLabel}
            onNavigate={() => setDrawerOpen(false)}
          />
          <div className={styles.drawerFooter}>
            <div className={styles.user}>
              <strong>{user?.name}</strong>
              <span>{user?.role.replaceAll("_", " ")}</span>
            </div>
            <Button variant="outline" onClick={logout}>
              <Icon name="log-out" />
              Sign out
            </Button>
          </div>
        </aside>
        <main className={styles.main}>{children}</main>
      </div>
    </SidebarProvider>
  );
}
