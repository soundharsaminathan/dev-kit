import "@testing-library/jest-dom/vitest";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ScrollFade } from "../ScrollFade";

describe("ScrollFade", () => {
  it("renders a scroll container with data attributes", () => {
    render(
      <ScrollFade data-testid="scroll-fade">
        <div style={{ height: 200 }}>Content</div>
      </ScrollFade>,
    );

    const element = document.querySelector("[data-slot='scroll-fade']");
    expect(element).toBeInTheDocument();
    expect(element).toHaveAttribute("role", "presentation");
  });
});
