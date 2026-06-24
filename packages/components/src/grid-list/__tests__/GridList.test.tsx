import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
});
