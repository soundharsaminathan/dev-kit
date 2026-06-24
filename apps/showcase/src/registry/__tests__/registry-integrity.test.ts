import { describe, expect, it } from "vitest";
import { allComponents, componentCategories } from "@/lib/components-data";
import { getAllRegistryEntries, getRegistryEntry } from "../index";

describe("registry integrity", () => {
  it("every catalog slug has a registry entry", () => {
    const missing = allComponents
      .map((component) => component.slug)
      .filter((slug) => getRegistryEntry(slug) == null);

    expect(missing, `Missing registry entries: ${missing.join(", ")}`).toEqual(
      [],
    );
  });

  it("every registry entry slug appears in the catalog", () => {
    const catalogSlugs = new Set(
      allComponents.map((component) => component.slug),
    );
    const orphans = getAllRegistryEntries()
      .map((entry) => entry.config.slug)
      .filter((slug) => !catalogSlugs.has(slug));

    expect(orphans, `Orphan registry slugs: ${orphans.join(", ")}`).toEqual([]);
  });

  it("registry config categories match catalog categories", () => {
    const categoryBySlug = new Map(
      allComponents.map((component) => [component.slug, component.category]),
    );

    for (const entry of getAllRegistryEntries()) {
      expect(entry.config.category).toBe(categoryBySlug.get(entry.config.slug));
    }
  });

  it("catalog categories are non-empty", () => {
    expect(componentCategories.length).toBeGreaterThan(0);
    expect(getAllRegistryEntries().length).toBeGreaterThan(0);
  });
});
