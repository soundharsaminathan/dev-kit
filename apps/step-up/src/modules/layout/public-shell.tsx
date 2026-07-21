import { Button } from "@dev-ui/components/button";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import styles from "./public-shell.module.scss";

type PublicShellProps = {
  children: ReactNode;
};

export function PublicShell({ children }: PublicShellProps) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link to="/" className={styles.brand}>
          Step Up
        </Link>
        <nav className={styles.nav}>
          <Link to="/studio">
            <Button variant="quiet">Studio</Button>
          </Link>
          <Link to="/login">
            <Button variant="primary">Sign in</Button>
          </Link>
        </nav>
      </header>
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}>
        Step Up Dance Studio — move with confidence.
      </footer>
    </div>
  );
}
