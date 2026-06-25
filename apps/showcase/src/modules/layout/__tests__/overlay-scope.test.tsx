// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OverlayScope } from "@/modules/layout/overlay-scope";

describe("OverlayScope", () => {
  it("renders children inside an overlay portal host", () => {
    render(
      <OverlayScope className="custom-scope">
        <span>Scoped content</span>
      </OverlayScope>,
    );

    expect(screen.getByText("Scoped content")).toBeInTheDocument();
    expect(
      document.querySelector("[data-showcase-overlay-root]"),
    ).not.toBeNull();
  });
});
