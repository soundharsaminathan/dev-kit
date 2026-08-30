import { Button } from "@dev-ui/components/button";
import { Link } from "@tanstack/react-router";
import { PublicShell } from "@/modules/layout/public-shell";
import styles from "./not-found.module.scss";

export function NotFoundPage() {
  return (
    <PublicShell nav="minimal">
      <div className={styles.page}>
        <p className={styles.code}>404</p>
        <h1 className={styles.title}>This page is not here</h1>
        <p className={styles.body}>
          The link may be old, or the page may have moved. Head back to classa
          and start from the studio workspace.
        </p>
        <Link to="/" className={styles.link}>
          <Button variant="primary">Back to classa</Button>
        </Link>
      </div>
    </PublicShell>
  );
}
