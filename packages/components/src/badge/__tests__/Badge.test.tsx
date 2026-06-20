import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "../Badge";

describe("Badge", () => {
  it("renders children", () => {
    render(<Badge>Status</Badge>);
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("uses presentation role", () => {
    render(<Badge>Status</Badge>);
    expect(screen.getByText("Status")).toHaveAttribute("role", "presentation");
  });

  it("applies variant and appearance defaults", () => {
    render(<Badge>Status</Badge>);
    const badge = screen.getByText("Status");
    expect(badge).toHaveAttribute("data-variant", "neutral");
    expect(badge).toHaveAttribute("data-appearance", "solid");
    expect(badge).toHaveAttribute("data-size", "md");
  });

  it("applies custom variant and size", () => {
    render(
      <Badge variant="success" size="sm" appearance="subtle">
        OK
      </Badge>,
    );
    const badge = screen.getByText("OK");
    expect(badge).toHaveAttribute("data-variant", "success");
    expect(badge).toHaveAttribute("data-size", "sm");
    expect(badge).toHaveAttribute("data-appearance", "subtle");
  });
});
