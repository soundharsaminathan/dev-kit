import { createFileRoute } from "@tanstack/react-router";
import { componentCategories } from "@/lib/components-data";
import { ComponentsGrid } from "@/modules/components-list/components-grid";
import styles from "@/modules/components-list/components-list.module.scss";

export const Route = createFileRoute("/components/")({
  component: ComponentsIndexPage,
});

function ComponentsIndexPage() {
  return (
    <div className={styles.page}>
      <div>
        <h1 className={styles.pageTitle}>Components</h1>
        <p className={styles.pageDescription}>
          Interactive playgrounds for every component. Pick a card to explore
          props and variants.
        </p>
      </div>
      {componentCategories.map((category) => (
        <ComponentsGrid key={category.slug} category={category} />
      ))}
    </div>
  );
}
