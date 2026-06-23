import { describe, expect, it } from "vitest";
import { getRegistryEntry } from "@/registry";
import {
  allComponents,
  componentCategories,
  getComponentBySlug,
  getComponentNeighbors,
  getRegisteredSlugs,
  slugToName,
} from "../components-data";

describe("components-data", () => {
  it("getComponentBySlug returns component metadata", () => {
    const button = getComponentBySlug("button");
    expect(button).toMatchObject({
      slug: "button",
      name: "Button",
      category: "buttons",
    });
  });

  it("getComponentBySlug returns undefined for unknown slug", () => {
    expect(getComponentBySlug("not-a-component")).toBeUndefined();
  });

  it("getComponentNeighbors returns previous and next components", () => {
    const { previous, next } = getComponentNeighbors("toggle-button");
    expect(previous).toMatchObject({ slug: "button" });
    expect(next).toMatchObject({ slug: "toggle-button-group" });
  });

  it("getComponentNeighbors returns null neighbors for unknown slug", () => {
    expect(getComponentNeighbors("missing")).toEqual({
      previous: null,
      next: null,
    });
  });

  it("getComponentNeighbors has no previous for first component", () => {
    const first = allComponents[0]!;
    const { previous } = getComponentNeighbors(first.slug);
    expect(previous).toBeNull();
  });

  it("getComponentNeighbors has no next for last component", () => {
    const last = allComponents.at(-1)!;
    const { next } = getComponentNeighbors(last.slug);
    expect(next).toBeNull();
  });

  it("slugToName uses catalog name when registered", () => {
    expect(slugToName("button")).toBe("Button");
  });

  it("slugToName falls back to title case for unknown slug", () => {
    expect(slugToName("my-custom-widget")).toBe("MyCustomWidget");
  });

  it("getRegisteredSlugs only includes components with registry entries", () => {
    const slugs = getRegisteredSlugs();
    expect(slugs.length).toBeGreaterThan(0);
    for (const slug of slugs) {
      expect(getRegistryEntry(slug)).not.toBeNull();
    }
  });

  it("every category lists at least one component", () => {
    for (const category of componentCategories) {
      expect(category.components.length).toBeGreaterThan(0);
    }
  });
});
