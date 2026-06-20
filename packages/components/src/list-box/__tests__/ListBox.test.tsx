import "@testing-library/jest-dom/vitest";
import { useListState } from "@react-stately/list";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CollectionItem } from "../collection-utils";
import { getCollectionChild } from "../collection-utils";
import {
  ListBox,
  ListBoxItem,
  ListBoxItemDescription,
  ListBoxItemLabel,
  ListBoxSection,
  ListBoxWithState,
} from "../ListBox";

const countryItems: CollectionItem[] = [
  { id: "us", label: "United States" },
  { id: "ca", label: "Canada" },
  { id: "mx", label: "Mexico", isDisabled: true },
];

describe("ListBox", () => {
  it("renders listbox options", () => {
    render(
      <ListBox aria-label="Countries">
        <ListBoxItem id="us">United States</ListBoxItem>
        <ListBoxItem id="ca">Canada</ListBoxItem>
      </ListBox>,
    );
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getByText("United States")).toBeInTheDocument();
    expect(screen.getByText("Canada")).toBeInTheDocument();
  });

  it("renders options from the items prop", () => {
    render(<ListBox aria-label="Countries" items={countryItems} />);

    expect(
      screen.getByRole("option", { name: "United States" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Canada" })).toBeInTheDocument();
  });

  it("selects an item on click", () => {
    render(<ListBox aria-label="Countries" items={countryItems} />);

    fireEvent.click(screen.getByRole("option", { name: "Canada" }));

    expect(screen.getByRole("option", { name: "Canada" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen
        .getByRole("option", { name: "Canada" })
        .querySelector("[data-listbox-item-indicator]"),
    ).toBeInTheDocument();
  });

  it("supports multiple selection", () => {
    render(
      <ListBox
        aria-label="Countries"
        items={countryItems}
        selectionMode="multiple"
      />,
    );

    fireEvent.click(screen.getByRole("option", { name: "United States" }));
    fireEvent.click(screen.getByRole("option", { name: "Canada" }));

    expect(
      screen.getByRole("option", { name: "United States" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", { name: "Canada" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("marks disabled options", () => {
    render(<ListBox aria-label="Countries" items={countryItems} />);

    expect(screen.getByRole("option", { name: "Mexico" })).toHaveAttribute(
      "data-disabled",
      "true",
    );
  });

  it("moves focus with arrow keys", () => {
    render(<ListBox aria-label="Countries" items={countryItems} />);

    const listbox = screen.getByRole("listbox");
    act(() => {
      listbox.focus();
      fireEvent.keyDown(listbox, { key: "ArrowDown" });
    });

    expect(screen.getByRole("option", { name: "Canada" })).toHaveAttribute(
      "data-focused",
      "true",
    );
  });

  it("renders custom item label and description", () => {
    render(
      <ListBox aria-label="Countries">
        <ListBoxItem id="us">
          <ListBoxItemLabel>United States</ListBoxItemLabel>
          <ListBoxItemDescription>North America</ListBoxItemDescription>
        </ListBoxItem>
      </ListBox>,
    );

    expect(screen.getByText("United States")).toHaveAttribute(
      "data-listbox-item-label",
      "",
    );
    expect(screen.getByText("North America")).toHaveAttribute(
      "data-listbox-item-description",
      "",
    );
  });

  it("renders items nested in a section", () => {
    render(
      <ListBox aria-label="Countries">
        <ListBoxSection title="North America">
          <ListBoxItem id="us">United States</ListBoxItem>
        </ListBoxSection>
      </ListBox>,
    );

    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "United States" }),
    ).toBeInTheDocument();
  });

  it("renders with external list state", () => {
    function ControlledListBox() {
      const state = useListState({
        items: countryItems,
        selectionMode: "single",
        children: getCollectionChild,
      });

      return (
        <ListBoxWithState
          state={state}
          listBoxOptions={{
            "aria-label": "Countries",
            selectionMode: "single",
          }}
        />
      );
    }

    render(<ControlledListBox />);

    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("option", { name: "United States" }));
    expect(
      screen.getByRole("option", { name: "United States" }),
    ).toHaveAttribute("aria-selected", "true");
  });

  it("throws when ListBoxItem is rendered outside ListBox", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() =>
      render(<ListBoxItem id="us">United States</ListBoxItem>),
    ).toThrow("ListBoxItem must be used within ListBox");

    consoleError.mockRestore();
  });

  it("supports selectionMode none without indicators", () => {
    render(
      <ListBox
        aria-label="Countries"
        items={countryItems}
        selectionMode="none"
      />,
    );

    fireEvent.click(screen.getByRole("option", { name: "United States" }));

    expect(
      screen
        .getByRole("option", { name: "United States" })
        .querySelector("[data-listbox-item-indicator]"),
    ).not.toBeInTheDocument();
  });

  it("renders a section without a title", () => {
    render(
      <ListBox aria-label="Countries">
        <ListBoxSection>
          <ListBoxItem id="us">United States</ListBoxItem>
        </ListBoxSection>
      </ListBox>,
    );

    expect(
      screen.getByRole("option", { name: "United States" }),
    ).toBeInTheDocument();
    expect(
      document.querySelector("[data-listbox-section-header='']"),
    ).not.toBeInTheDocument();
  });
});
