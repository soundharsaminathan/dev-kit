import { Button } from "@dev-ui/components/button";
import { Drawer } from "@dev-ui/components/drawer";
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
import { type CSSProperties, type ReactNode, useEffect, useState } from "react";
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
  withTooltips = true,
}: {
  items: readonly NavItem[];
  navLabel?: string;
  onNavigate?: (() => void) | undefined;
  withTooltips?: boolean;
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
            <SidebarItem
              key={item.to}
              {...(withTooltips ? { tooltip: item.label } : {})}
            >
              <Link
                to={item.to}
                activeOptions={{ exact: Boolean(item.exact) }}
                className={
                  active ? `${styles.link} ${styles.linkActive}` : styles.link
                }
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

function StaffSidebar({
  subtitle,
  navLabel,
  items,
  onNavigate,
  withTooltips,
}: Omit<StaffShellProps, "children"> & {
  onNavigate?: () => void;
  withTooltips: boolean;
}) {
  const { user, logout } = useAuth();

  return (
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
        {onNavigate ? null : <SidebarToggle />}
      </SidebarHeader>
      <SidebarContent>
        <NavLinks
          items={items}
          navLabel={navLabel}
          onNavigate={onNavigate}
          withTooltips={withTooltips}
        />
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
  );
}

export function StaffShell({
  subtitle,
  navLabel,
  items,
  children,
}: StaffShellProps) {
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

  return (
    <SidebarProvider
      isOpen={sidebarOpen}
      onOpenChange={setSidebarOpen}
      className={styles.shell}
    >
      <div className={styles.sidebarWrap}>
        <StaffSidebar
          subtitle={subtitle}
          navLabel={navLabel}
          items={items}
          withTooltips
        />
      </div>

      {mobile ? (
        <Drawer
          placement="left"
          sizing="static"
          isOpen={drawerOpen}
          onOpenChange={setDrawerOpen}
          isDismissable
          style={{ "--drawer-inline-size": "18rem" } as CSSProperties}
        >
          <div className={styles.drawerSidebar}>
            <StaffSidebar
              subtitle={subtitle}
              navLabel={navLabel}
              items={items}
              withTooltips={false}
              onNavigate={() => setDrawerOpen(false)}
            />
          </div>
        </Drawer>
      ) : null}

      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <Button
            variant="quiet"
            isIconOnly
            aria-expanded={drawerOpen}
            aria-label={drawerOpen ? "Close menu" : "Open menu"}
            onClick={() => setDrawerOpen((value) => !value)}
          >
            <Icon name={drawerOpen ? "x" : "menu"} />
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
        <main className={styles.main}>{children}</main>
      </div>
    </SidebarProvider>
  );
}
