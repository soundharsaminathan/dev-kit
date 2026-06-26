import { createFileRoute, Link } from "@tanstack/react-router";
import styles from "@/modules/components-list/components-list.module.scss";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className={styles.page}>
      <div>
        <h1 className={styles.pageTitle}>Component Showcase</h1>
        <p className={styles.pageDescription}>
          A personal gallery of UI components built with React Aria and design
          tokens. Browse interactive playgrounds, compare themes, and create
          custom palettes.
        </p>
      </div>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <Link
          to="/components"
          style={{
            padding: "0.6rem 1rem",
            borderRadius: "var(--radius-md)",
            background: "var(--color-primary)",
            color: "var(--color-fg-on-primary)",
            fontWeight: 500,
          }}
        >
          Browse components
        </Link>
        <Link
          to="/themes"
          style={{
            padding: "0.6rem 1rem",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border)",
            fontWeight: 500,
          }}
        >
          Compare themes
        </Link>
      </div>
    </div>
  );
}
