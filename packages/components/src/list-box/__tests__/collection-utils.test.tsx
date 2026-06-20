import { describe, expect, it } from "vitest";
import { MenuItem, MenuSection } from "../../menu/Menu";
import {
  type CollectionItem,
  findChildByDisplayName,
  getCollectionChild,
  getDisabledKeys,
  getItemTextValue,
  parseCollectionItems,
} from "../collection-utils";
import { ListBoxItem, ListBoxSection } from "../ListBox";

describe("collection-utils", () => {
  it("finds a child by display name", () => {
    function Trigger() {
      return null;
    }
    Trigger.displayName = "SelectTrigger";

    const child = findChildByDisplayName(
      [
        <Trigger key="trigger" />,
        <ListBoxItem key="a" id="a">
          A
        </ListBoxItem>,
      ],
      "SelectTrigger",
    );

    expect(child?.type).toBe(Trigger);
  });

  it("parses nested list box sections", () => {
    const items = parseCollectionItems(
      <ListBoxSection title="North America">
        <ListBoxItem id="us">United States</ListBoxItem>
      </ListBoxSection>,
    );

    expect(items).toEqual([
      expect.objectContaining({ id: "us", label: "United States" }),
    ]);
  });

  it("parses nested menu sections", () => {
    const items = parseCollectionItems(
      <MenuSection title="Actions">
        <MenuItem id="edit">Edit</MenuItem>
      </MenuSection>,
      "MenuItem",
    );

    expect(items).toEqual([
      expect.objectContaining({ id: "edit", label: "Edit" }),
    ]);
  });

  it("collects disabled keys and text values", () => {
    const items: CollectionItem[] = [
      { id: "a", label: "Alpha" },
      { id: "b", label: <span>Beta</span>, isDisabled: true },
    ];

    expect(getDisabledKeys(items)).toEqual(new Set(["b"]));
    expect(getItemTextValue(items[0]!)).toBe("Alpha");
    expect(getItemTextValue(items[1]!)).toBe("b");
    expect(getCollectionChild(items[0]!)!.key).toBe("a");
  });

  it("ignores invalid children when parsing collection items", () => {
    expect(parseCollectionItems(["not-an-element", null, false])).toEqual([]);
  });
});
