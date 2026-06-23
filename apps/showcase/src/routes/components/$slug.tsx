import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  getComponentBySlug,
  getComponentNeighbors,
} from "@/lib/components-data";
import styles from "@/modules/components-list/components-list.module.scss";
import pagerStyles from "@/modules/layout/pager.module.scss";
import { InteractiveDemo } from "@/modules/showcase/interactive-demo";
import { getRegistryEntry } from "@/registry";

export const Route = createFileRoute("/components/$slug")({
  component: ComponentDetailPage,
  loader: ({ params }) => {
    const component = getComponentBySlug(params.slug);
    const entry = getRegistryEntry(params.slug);
    if (!component || !entry) {
      throw notFound();
    }
    return {
      component,
      entry,
      neighbors: getComponentNeighbors(params.slug),
    };
  },
});

function ComponentDetailPage() {
  const { component, entry, neighbors } = Route.useLoaderData();

  return (
    <div className={styles.page}>
      <div>
        <p
          style={{
            fontSize: "0.8rem",
            color: "var(--color-fg-muted)",
            marginBottom: "0.25rem",
          }}
        >
          {component.categoryTitle}
        </p>
        <h1 className={styles.pageTitle}>{entry.config.name}</h1>
        <p className={styles.pageDescription}>{entry.config.description}</p>
      </div>

      <InteractiveDemo
        Playground={entry.Playground}
        controls={entry.config.controls}
        {...(entry.config.normalizeControlValues
          ? { normalizeControlValues: entry.config.normalizeControlValues }
          : {})}
        title="Playground"
      />

      <nav className={pagerStyles.pager} aria-label="Component pager">
        {neighbors.previous ? (
          <Link
            to="/components/$slug"
            params={{ slug: neighbors.previous.slug }}
            className={pagerStyles.link}
          >
            ← {neighbors.previous.name}
          </Link>
        ) : (
          <span />
        )}
        {neighbors.next ? (
          <Link
            to="/components/$slug"
            params={{ slug: neighbors.next.slug }}
            className={pagerStyles.link}
          >
            {neighbors.next.name} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
