import type { ComponentCategory } from "@/lib/components-data";
import { ComponentCard } from "./component-card";
import styles from "./components-list.module.scss";

export function ComponentsGrid({ category }: { category: ComponentCategory }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{category.title}</h2>
      <div className={styles.grid}>
        {category.components.map((component) => (
          <ComponentCard key={component.slug} deferPreview {...component} />
        ))}
      </div>
    </section>
  );
}
