import { Link, useRouterState } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import styles from "./shell.module.scss";

const MOBILE_NAV_QUERY = "(max-width: 860px)";

type NavItem = {
  to: string;
  label: string;
  exact?: boolean;
};

type StaffShellProps = {
  subtitle: string;
  navLabel: string;
  items: readonly NavItem[];
  children: ReactNode;
};

export function StaffShell({
  subtitle,
  navLabel,
  items,
  children,
}: StaffShellProps) {
  const { user, logout } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(MOBILE_NAV_QUERY);
    const sync = () => setMobile(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  const drawerOpen = mobile && open;

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <button
          type="button"
          className={styles.menuButton}
          aria-expanded={drawerOpen}
          aria-controls="staff-nav"
          onClick={() => setOpen((value) => !value)}
        >
          <span className={styles.menuIcon} data-open={drawerOpen || undefined}>
            <span />
            <span />
            <span />
          </span>
          <span className={styles.srOnly}>
            {drawerOpen ? "Close menu" : "Open menu"}
          </span>
        </button>
        <div className={styles.brand}>
          <span className={styles.mark} aria-hidden />
          <div>
            <strong>loan-mate</strong>
            <p>{subtitle}</p>
          </div>
        </div>
      </header>
      {drawerOpen ? (
        <button
          type="button"
          className={styles.backdrop}
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <aside
        id="staff-nav"
        className={styles.nav}
        data-open={drawerOpen ? "true" : "false"}
        inert={mobile && !open ? true : undefined}
      >
        <div className={styles.brand}>
          <span className={styles.mark} aria-hidden />
          <div>
            <strong>loan-mate</strong>
            <p>{subtitle}</p>
          </div>
        </div>
        <nav aria-label={navLabel}>
          {items.map((item) => {
            const active = item.exact
              ? pathname === item.to
              : pathname === item.to || pathname.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: Boolean(item.exact) }}
                className={active ? styles.active : undefined}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className={styles.footer}>
          <div className={styles.user}>
            <strong>{user?.name}</strong>
            <span>{user?.role.replaceAll("_", " ")}</span>
          </div>
          <button
            type="button"
            className="lm-btn lm-btn-secondary"
            onClick={logout}
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
