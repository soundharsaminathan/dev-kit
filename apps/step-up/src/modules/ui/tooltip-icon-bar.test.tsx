import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { TooltipIconBar, TooltipIconBarItem } from "./tooltip-icon-bar";

function mockRect(overrides: Partial<DOMRect> = {}): DOMRect {
  const left = overrides.left ?? 20;
  const top = overrides.top ?? 20;
  const width = overrides.width ?? 40;
  const height = overrides.height ?? 32;
  return {
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    toJSON() {
      return {};
    },
  } as DOMRect;
}

describe("TooltipIconBar", () => {
  let observerCallback: IntersectionObserverCallback | undefined;
  const observe = vi.fn();
  const disconnect = vi.fn();

  beforeEach(() => {
    observerCallback = undefined;
    observe.mockClear();
    disconnect.mockClear();

    class MockIntersectionObserver {
      constructor(callback: IntersectionObserverCallback) {
        observerCallback = callback;
      }
      observe = observe;
      disconnect = disconnect;
      unobserve = vi.fn();
      takeRecords = vi.fn(() => []);
      root = null;
      rootMargin = "";
      thresholds = [0];
    }

    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
      mockRect(),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("hides the tooltip when the trigger scrolls out of view", async () => {
    renderWithProviders(
      <TooltipIconBar delay={0} portal>
        <TooltipIconBarItem label="New message">
          <button type="button">Compose</button>
        </TooltipIconBarItem>
      </TooltipIconBar>,
    );

    fireEvent.mouseEnter(screen.getByRole("button", { name: "Compose" }));

    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    expect(observe).toHaveBeenCalled();

    act(() => {
      observerCallback?.(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    await waitFor(() => {
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });
  });
});
