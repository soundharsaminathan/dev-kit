import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import styles from "./shell.module.scss";

const ADMIN_NAV = [
  { to: "/admin", label: "Companies", exact: true },
  { to: "/admin/profile", label: "Profile" },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className={styles.shell}>
      <aside className={styles.nav}>
        <div className={styles.brand}>
          <span className={styles.mark} aria-hidden />
          <div>
            <strong>loan-mate</strong>
            <p>Platform admin</p>
          </div>
        </div>
        <nav aria-label="Admin">
          {ADMIN_NAV.map((item) => {
            const active =
              "exact" in item && item.exact
                ? pathname === item.to
                : pathname === item.to || pathname.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={active ? styles.active : undefined}
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
          <button type="button" className="lm-btn lm-btn-secondary" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
