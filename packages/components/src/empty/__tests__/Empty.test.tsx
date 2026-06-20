import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../Empty";

describe("Empty", () => {
  it("renders empty state content", () => {
    render(
      <Empty>
        <EmptyTitle>No results</EmptyTitle>
        <EmptyDescription>Try another search.</EmptyDescription>
      </Empty>,
    );
    expect(screen.getByText("No results")).toBeInTheDocument();
    expect(screen.getByText("Try another search.")).toBeInTheDocument();
  });

  it("sets data-slot on root", () => {
    render(<Empty>Content</Empty>);
    expect(screen.getByText("Content")).toHaveAttribute("data-slot", "empty");
  });

  it("renders all subcomponents with data slots", () => {
    render(
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">Icon</EmptyMedia>
          <EmptyTitle>No results</EmptyTitle>
          <EmptyDescription>Try another search.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <button type="button">Create item</button>
        </EmptyContent>
      </Empty>,
    );

    expect(screen.getByText("Icon").closest("[data-slot]")).toHaveAttribute(
      "data-slot",
      "empty-media",
    );
    expect(screen.getByText("Icon").closest("[data-slot]")).toHaveAttribute(
      "data-variant",
      "icon",
    );
    expect(screen.getByText("No results")).toHaveAttribute(
      "data-slot",
      "empty-title",
    );
    expect(screen.getByText("Try another search.")).toHaveAttribute(
      "data-slot",
      "empty-description",
    );
    expect(
      screen.getByRole("button", { name: "Create item" }).parentElement,
    ).toHaveAttribute("data-slot", "empty-content");
    expect(
      screen.getByText("Icon").closest("[data-slot='empty-header']"),
    ).toBeInTheDocument();
  });
});
