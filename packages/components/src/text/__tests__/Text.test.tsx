import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Text } from "../Text";

describe("Text", () => {
  it("renders children", () => {
    render(<Text>Description</Text>);
    expect(screen.getByText("Description")).toBeInTheDocument();
  });

  it("sets data-text attribute", () => {
    render(<Text>Description</Text>);
    expect(screen.getByText("Description")).toHaveAttribute("data-text", "");
  });

  it("sets data-slot when provided", () => {
    render(<Text slot="description">Description</Text>);
    expect(screen.getByText("Description")).toHaveAttribute(
      "data-slot",
      "description",
    );
  });
});
