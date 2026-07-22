import "@testing-library/jest-dom/vitest";
import { setInteractionModality } from "@react-aria/interactions";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Button } from "../../button/Button";
import { Tooltip, TooltipContent } from "../Tooltip";

function createMatchMediaMock(getMatches: (query: string) => boolean) {
  return (query: string): MediaQueryList => ({
    matches: getMatches(query),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });
}

describe("Tooltip", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setInteractionModality("pointer");
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: vi
        .fn()
        .mockImplementation(
          createMatchMediaMock(
            (query) =>
              query.includes("hover: hover") && query.includes("pointer: fine"),
          ),
        ),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders trigger element", () => {
    render(
      <Tooltip>
        <Button>Save</Button>
        <TooltipContent>Save file</TooltipContent>
      </Tooltip>,
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("shows content after hover delay", () => {
    render(
      <Tooltip delay={0}>
        <button type="button">Save</button>
        <TooltipContent>Save file</TooltipContent>
      </Tooltip>,
    );

    fireEvent.pointerEnter(screen.getByRole("button", { name: "Save" }), {
      pointerType: "mouse",
    });
    vi.runAllTimers();

    expect(screen.getByRole("tooltip")).toHaveTextContent("Save file");
  });

  it("shows content when trigger is Button", () => {
    render(
      <Tooltip delay={0}>
        <Button>Save</Button>
        <TooltipContent>Save file</TooltipContent>
      </Tooltip>,
    );

    fireEvent.pointerEnter(screen.getByRole("button", { name: "Save" }), {
      pointerType: "mouse",
    });
    vi.runAllTimers();

    expect(screen.getByRole("tooltip")).toHaveTextContent("Save file");
  });

  it("marks full-width triggers for layout", () => {
    render(
      <div style={{ width: 280 }}>
        <Tooltip fullWidth>
          <Button>Save</Button>
          <TooltipContent>Save file</TooltipContent>
        </Tooltip>
      </div>,
    );

    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute(
      "data-tooltip-trigger",
      "true",
    );
    expect(
      screen.getByRole("button").closest("[data-full-width]"),
    ).toHaveAttribute("data-full-width", "true");
  });

  it("opens on tap when hover is unavailable", () => {
    vi.mocked(window.matchMedia).mockImplementation(
      createMatchMediaMock(() => false),
    );

    render(
      <Tooltip delay={0} touchBehavior="toggle">
        <Button>Save</Button>
        <TooltipContent>Save file</TooltipContent>
      </Tooltip>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    vi.runAllTimers();

    expect(screen.getByRole("tooltip")).toHaveTextContent("Save file");
  });

  it("applies placement to content", () => {
    render(
      <Tooltip delay={0}>
        <button type="button">Save</button>
        <TooltipContent placement="bottom">Save file</TooltipContent>
      </Tooltip>,
    );

    fireEvent.pointerEnter(screen.getByRole("button", { name: "Save" }), {
      pointerType: "mouse",
    });
    vi.runAllTimers();

    expect(screen.getByRole("tooltip")).toHaveAttribute(
      "data-placement",
      "bottom",
    );
  });

  it("throws when TooltipContent is rendered outside Tooltip", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<TooltipContent>Orphan</TooltipContent>)).toThrow(
      "TooltipContent must be used within Tooltip",
    );

    consoleError.mockRestore();
  });

  it("syncs trigger width for full-width tooltips", () => {
    render(
      <div style={{ width: 280 }}>
        <Tooltip delay={0} fullWidth>
          <Button>Save</Button>
          <TooltipContent>Save file</TooltipContent>
        </Tooltip>
      </div>,
    );

    fireEvent.pointerEnter(screen.getByRole("button", { name: "Save" }), {
      pointerType: "mouse",
    });
    vi.runAllTimers();

    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveAttribute("data-match-trigger-width", "true");
    expect(tooltip.style.getPropertyValue("--trigger-width")).not.toBe("");
  });

  it("closes on a second click when hover is unavailable", () => {
    vi.mocked(window.matchMedia).mockImplementation(
      createMatchMediaMock(() => false),
    );

    render(
      <Tooltip delay={0} touchBehavior="toggle">
        <Button>Save</Button>
        <TooltipContent>Save file</TooltipContent>
      </Tooltip>,
    );

    const trigger = screen.getByRole("button", { name: "Save" });

    fireEvent.click(trigger);
    vi.runAllTimers();
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    fireEvent.click(trigger);
    vi.runAllTimers();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("toggles with keyboard when hover is unavailable", () => {
    vi.mocked(window.matchMedia).mockImplementation(
      createMatchMediaMock(() => false),
    );

    render(
      <Tooltip delay={0} touchBehavior="toggle">
        <Button>Save</Button>
        <TooltipContent>Save file</TooltipContent>
      </Tooltip>,
    );

    const trigger = screen.getByRole("button", { name: "Save" });

    fireEvent.keyDown(trigger, { key: "Enter" });
    vi.runAllTimers();
    expect(screen.getByRole("tooltip")).toHaveTextContent("Save file");

    fireEvent.keyDown(trigger, { key: "Enter" });
    vi.runAllTimers();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("clamps portal tooltips inside the viewport near the right edge", () => {
    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 320,
    });

    render(
      <div style={{ position: "fixed", right: 0, top: 40 }}>
        <Tooltip delay={0}>
          <button type="button">Bell</button>
          <TooltipContent portal placement="bottom">
            Notifications
          </TooltipContent>
        </Tooltip>
      </div>,
    );

    const trigger = screen.getByRole("button", { name: "Bell" });
    trigger.getBoundingClientRect = () =>
      ({
        x: 280,
        y: 40,
        top: 40,
        left: 280,
        bottom: 72,
        right: 312,
        width: 32,
        height: 32,
        toJSON() {
          return {};
        },
      }) as DOMRect;

    fireEvent.pointerEnter(trigger, { pointerType: "mouse" });
    vi.runAllTimers();

    const tooltip = screen.getByRole("tooltip");
    Object.defineProperty(tooltip, "offsetWidth", {
      configurable: true,
      value: 120,
    });
    Object.defineProperty(tooltip, "offsetHeight", {
      configurable: true,
      value: 32,
    });

    act(() => {
      window.dispatchEvent(new Event("resize"));
    });

    expect(Number.parseFloat(tooltip.style.left)).toBeLessThanOrEqual(
      320 - 8 - 120,
    );
    expect(Number.parseFloat(tooltip.style.left)).toBeGreaterThanOrEqual(8);

    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: originalInnerWidth,
    });
  });
});
