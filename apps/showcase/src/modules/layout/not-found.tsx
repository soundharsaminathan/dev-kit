import { Link } from "@tanstack/react-router";
import styles from "@/modules/components-list/components-list.module.scss";

export function ComponentNotFound() {
  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Component not found</h1>
      <p className={styles.pageDescription}>
        No showcase entry exists for this component.
      </p>
      <Link to="/components">Back to components</Link>
    </div>
  );
}
