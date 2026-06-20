import "@testing-library/jest-dom/vitest";
import { useListState } from "@react-stately/list";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { type CollectionItem, getCollectionChild } from "../collection-utils";
import { ListBoxContext, ListBoxItem } from "../ListBox";

const countryItems: CollectionItem[] = [
  { id: "us", label: "United States" },
  { id: "ca", label: "Canada" },
];

function MissingListBoxItemHarness() {
  const state = useListState({
    items: countryItems,
    selectionMode: "single",
    children: getCollectionChild,
  });

  return (
    <ListBoxContext.Provider
      value={{ state: state as never, selectionMode: "single" }}
    >
      <ListBoxItem id="missing">Missing</ListBoxItem>
    </ListBoxContext.Provider>
  );
}

describe("ListBoxItem", () => {
  it("returns null when the item is missing from the collection", () => {
    render(<MissingListBoxItemHarness />);
    expect(screen.queryByText("Missing")).not.toBeInTheDocument();
  });
});
