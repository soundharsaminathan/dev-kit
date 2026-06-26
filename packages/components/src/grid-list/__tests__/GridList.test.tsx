import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GridList, GridListItem } from "../index";

describe("GridList", () => {
  it("renders with grid role", () => {
    render(
      <GridList aria-label="Files" selectionMode="none">
        <GridListItem id="one">One</GridListItem>
        <GridListItem id="two">Two</GridListItem>
      </GridList>,
    );

    expect(screen.getByRole("grid", { name: "Files" })).toBeInTheDocument();
  });

  it("renders with data-grid-list attribute", () => {
    const { container } = render(
      <GridList aria-label="Files" selectionMode="none">
        <GridListItem id="one">One</GridListItem>
      </GridList>,
    );

    expect(container.querySelector("[data-grid-list='']")).toBeInTheDocument();
  });

  it("renders grid items", () => {
    render(
      <GridList aria-label="Files" selectionMode="none">
        <GridListItem id="one">One</GridListItem>
        <GridListItem id="two">Two</GridListItem>
      </GridList>,
    );

    expect(screen.getByText("One")).toBeInTheDocument();
    expect(screen.getByText("Two")).toBeInTheDocument();
  });

  it("selects items in single selection mode", () => {
    render(
      <GridList aria-label="Files" selectionMode="single">
        <GridListItem id="one">One</GridListItem>
        <GridListItem id="two">Two</GridListItem>
      </GridList>,
    );

    fireEvent.click(screen.getByText("One"));

    expect(
      screen.getByText("One").closest("[data-grid-list-item]"),
    ).toHaveAttribute("data-selected", "true");
    expect(
      document.querySelector("[data-grid-list-item-indicator]"),
    ).toBeInTheDocument();
  });

  it("supports multiple selection", () => {
    render(
      <GridList aria-label="Files" selectionMode="multiple">
        <GridListItem id="one">One</GridListItem>
        <GridListItem id="two">Two</GridListItem>
      </GridList>,
    );

    fireEvent.click(screen.getByText("One"));
    fireEvent.click(screen.getByText("Two"));

    expect(
      screen.getByText("One").closest("[data-grid-list-item]"),
    ).toHaveAttribute("data-selected", "true");
    expect(
      screen.getByText("Two").closest("[data-grid-list-item]"),
    ).toHaveAttribute("data-selected", "true");
  });

  it("renders from the items prop", () => {
    render(
      <GridList
        aria-label="Files"
        selectionMode="none"
        items={[
          { id: "one", label: "One" },
          { id: "two", label: "Two", isDisabled: true },
        ]}
      />,
    );

    expect(screen.getByText("One")).toBeInTheDocument();
    expect(
      screen.getByText("Two").closest("[data-grid-list-item]"),
    ).toHaveAttribute("data-disabled", "true");
  });

  it("throws when GridListItem is used outside GridList", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<GridListItem id="one">One</GridListItem>)).toThrow(
      "GridListItem must be used within GridList",
    );

    consoleError.mockRestore();
  });

  it("reflects hover state on grid items", () => {
    render(
      <GridList aria-label="Files" selectionMode="none">
        <GridListItem id="one">One</GridListItem>
      </GridList>,
    );

    const item = screen.getByText("One").closest("[data-grid-list-item]")!;
    fireEvent.pointerEnter(item, { pointerType: "mouse" });
    expect(item).toHaveAttribute("data-hovered", "true");
  });
});
