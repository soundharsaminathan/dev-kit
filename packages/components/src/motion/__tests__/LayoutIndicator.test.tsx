import { render } from "@testing-library/react";
import { useReducedMotion } from "motion/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LayoutIndicator } from "../LayoutIndicator";

describe("LayoutIndicator", () => {
  afterEach(() => {
    vi.mocked(useReducedMotion).mockReturnValue(true);
  });

  it("renders with layout id when reduced motion is preferred", () => {
    vi.mocked(useReducedMotion).mockReturnValue(true);
    const { container } = render(
      <LayoutIndicator layoutId="tabs" className="indicator" />,
    );

    const indicator = container.querySelector("[data-tab-indicator]");
    expect(indicator).not.toBeNull();
    expect(indicator).toHaveAttribute("aria-hidden", "true");
  });

  it("renders with spring transition when motion is not reduced", () => {
    vi.mocked(useReducedMotion).mockReturnValue(false);
    const { container } = render(<LayoutIndicator layoutId="tabs" />);

    expect(container.querySelector("[data-tab-indicator]")).not.toBeNull();
  });
});
