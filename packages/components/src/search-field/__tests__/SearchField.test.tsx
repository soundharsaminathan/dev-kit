import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  SearchField,
  SearchFieldClear,
  SearchFieldGroup,
  SearchFieldInput,
} from "../SearchField";

describe("SearchField", () => {
  it("renders a searchbox", () => {
    render(<SearchField aria-label="Search" />);
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });

  it("applies search field data attributes", () => {
    const { container } = render(
      <SearchField aria-label="Search" placeholder="Search..." />,
    );
    expect(
      container.querySelector("[data-search-field='']"),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
  });

  it("shows and clears the search value", () => {
    render(<SearchField aria-label="Search" defaultValue="query" />);

    const searchbox = screen.getByRole("searchbox");
    expect(searchbox).toHaveValue("query");
    expect(
      screen.getByRole("button", { name: "Clear search" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));

    expect(searchbox).toHaveValue("");
    expect(
      screen.queryByRole("button", { name: "Clear search" }),
    ).not.toBeInTheDocument();
  });

  it("updates the clear button as the user types", () => {
    render(<SearchField aria-label="Search" />);

    const searchbox = screen.getByRole("searchbox");
    expect(
      screen.queryByRole("button", { name: "Clear search" }),
    ).not.toBeInTheDocument();

    fireEvent.change(searchbox, { target: { value: "docs" } });

    expect(
      screen.getByRole("button", { name: "Clear search" }),
    ).toBeInTheDocument();
  });

  it("marks disabled state on the group and input", () => {
    const { container } = render(
      <SearchField aria-label="Search" isDisabled />,
    );

    expect(
      container.querySelector("[data-search-field-group='']"),
    ).toHaveAttribute("data-disabled", "true");
    expect(screen.getByRole("searchbox")).toHaveAttribute(
      "data-disabled",
      "true",
    );
  });

  it("reflects focus-visible state on the input", () => {
    render(<SearchField aria-label="Search" />);
    const searchbox = screen.getByRole("searchbox");

    act(() => {
      searchbox.focus();
    });
    fireEvent.keyDown(searchbox, { key: "Tab" });

    expect(searchbox).toHaveAttribute("data-focus-visible", "true");
  });

  it("supports custom composition", () => {
    render(
      <SearchField aria-label="Search">
        <SearchFieldGroup>
          <SearchFieldInput placeholder="Find items" />
          <SearchFieldClear>Reset</SearchFieldClear>
        </SearchFieldGroup>
      </SearchField>,
    );

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "item" },
    });

    expect(
      document.querySelector("[data-search-field-group='']"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Clear search" }),
    ).toHaveTextContent("Reset");
  });

  it("throws when subcomponents are rendered outside SearchField", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<SearchFieldGroup />)).toThrow(
      "SearchFieldGroup must be used within SearchField",
    );
    expect(() => render(<SearchFieldInput />)).toThrow(
      "SearchFieldInput must be used within SearchField",
    );
    expect(() => render(<SearchFieldClear />)).toThrow(
      "SearchFieldClear must be used within SearchField",
    );

    consoleError.mockRestore();
  });
});
