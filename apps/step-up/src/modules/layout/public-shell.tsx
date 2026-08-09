import { Button } from "@dev-ui/components/button";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { BRAND_ICON_SRC, BRAND_NAME } from "@/lib/brand";
import { SEED_STUDIO_ID } from "@/lib/constants";
import { homePathForUser } from "@/lib/require-auth";
import { useDismissBootPublic } from "@/lib/use-dismiss-boot-public";
import styles from "./public-shell.module.scss";

type PublicShellProps = {
  children: ReactNode;
  /** Login keeps the static shell until first input for LCP; others idle-dismiss. */
  bootDismiss?: "idle" | "interact";
};

export function PublicShell({
  children,
  bootDismiss = "idle",
}: PublicShellProps) {
  useDismissBootPublic(bootDismiss);
  const { user, loading } = useAuth();
  const appHome = user ? homePathForUser(user) : null;

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link to="/" className={styles.brand}>
          <img
            className={styles.brandIcon}
            src={BRAND_ICON_SRC}
            alt=""
            aria-hidden
          />
          <span>{BRAND_NAME}</span>
        </Link>
        <nav className={styles.nav}>
          <Link to="/studio/$studioId" params={{ studioId: SEED_STUDIO_ID }}>
            <Button variant="quiet">Studio</Button>
          </Link>
          {!loading &&
            (appHome ? (
              <Link to={appHome}>
                <Button variant="primary">Open app</Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button variant="primary">Sign in</Button>
              </Link>
            ))}
        </nav>
      </header>
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}>
        Step Up Dance Studio — move with confidence.
      </footer>
    </div>
  );
}
