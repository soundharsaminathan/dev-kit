import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Separator } from "../Separator";

describe("Separator", () => {
  it("renders with separator role", () => {
    render(<Separator />);
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });

  it("defaults to horizontal orientation", () => {
    render(<Separator />);
    expect(screen.getByRole("separator")).toHaveAttribute(
      "data-orientation",
      "horizontal",
    );
  });

  it("applies vertical orientation", () => {
    render(<Separator orientation="vertical" />);
    expect(screen.getByRole("separator")).toHaveAttribute(
      "data-orientation",
      "vertical",
    );
  });
});
