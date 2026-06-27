import type { ListState } from "@react-stately/list";
import { ListCollection } from "@react-stately/list";
import type { Node } from "@react-types/shared";
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  filterListCollection,
  useFilteredListState,
} from "../filter-list-collection";

type Item = { id: string; label: string };

function createNode(
  key: string,
  type: "item" | "section",
  textValue: string,
  childNodes: Node<Item>[] = [],
): Node<Item> {
  return {
    key,
    type,
    value: { id: key, label: textValue },
    textValue,
    rendered: textValue,
    index: 0,
    level: 0,
    hasChildNodes: childNodes.length > 0,
    childNodes,
    parentKey: null,
    prevKey: null,
    nextKey: null,
    props: {},
  } as Node<Item>;
}

describe("filterListCollection", () => {
  it("filters items by text value", () => {
    const collection = new ListCollection([
      createNode("us", "item", "United States"),
      createNode("ca", "item", "Canada"),
    ]);

    const filtered = filterListCollection(collection, (value) =>
      value.includes("Canada"),
    );

    expect([...filtered].map((node) => node.key)).toEqual(["ca"]);
  });

  it("removes empty sections after filtering", () => {
    const section = createNode("na", "section", "North America", [
      createNode("mx", "item", "Mexico"),
    ]);
    const collection = new ListCollection([
      section,
      createNode("fr", "item", "France"),
    ]);

    const filtered = filterListCollection(collection, (value) =>
      value.includes("France"),
    );

    expect([...filtered].map((node) => node.key)).toEqual(["fr"]);
  });

  it("keeps sections with matching children", () => {
    const section = createNode("na", "section", "North America", [
      createNode("us", "item", "United States"),
      createNode("ca", "item", "Canada"),
    ]);
    const collection = new ListCollection([section]);

    const filtered = filterListCollection(collection, (value) =>
      value.includes("Canada"),
    );

    expect([...filtered]).toHaveLength(1);
    expect(filtered.getChildren?.("na")).toBeDefined();
  });

  it("returns non-item nodes unchanged", () => {
    const header = {
      ...createNode("header", "item", "Header"),
      type: "header",
    } as Node<Item>;
    const collection = new ListCollection([header]);

    const filtered = filterListCollection(collection, () => false);

    expect([...filtered]).toHaveLength(1);
    expect(filtered.at(0)?.type).toBe("header");
  });
});

describe("useFilteredListState", () => {
  it("returns the original collection when no filter is provided", () => {
    const collection = new ListCollection([createNode("one", "item", "One")]);
    const nextSelectionManager = { collection };
    const selectionManager = {
      withCollection: () => nextSelectionManager,
    };
    const state = {
      collection,
      disabledKeys: new Set<string>(),
      selectionManager,
    } as unknown as ListState<Item>;

    const { result } = renderHook(() => useFilteredListState(state, undefined));

    expect(result.current.collection).toBe(collection);
    expect(result.current.selectionManager).toBe(nextSelectionManager);
  });
});
