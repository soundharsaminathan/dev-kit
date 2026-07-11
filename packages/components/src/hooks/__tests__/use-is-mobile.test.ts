import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useIsMobile } from "../use-is-mobile";

function createMediaQueryList() {
  const listeners = new Set<() => void>();

  return {
    matches: false,
    media: "(max-width: 767px)",
    addEventListener: vi.fn((_event: string, listener: () => void) => {
      listeners.add(listener);
    }),
    removeEventListener: vi.fn((_event: string, listener: () => void) => {
      listeners.delete(listener);
    }),
    dispatchChange() {
      for (const listener of listeners) {
        listener();
      }
    },
  };
}

describe("useIsMobile", () => {
  let mediaQuery: ReturnType<typeof createMediaQueryList>;

  beforeEach(() => {
    mediaQuery = createMediaQueryList();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn(() => mediaQuery),
    });
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1024,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("defaults to desktop before the media query effect runs", () => {
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("reports mobile when the viewport is below the breakpoint", () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 500,
    });

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("updates when the media query changes", () => {
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 400,
    });

    act(() => {
      mediaQuery.dispatchChange();
    });

    expect(result.current).toBe(true);
  });

  it("removes the media query listener on unmount", () => {
    const { unmount } = renderHook(() => useIsMobile());
    unmount();

    expect(mediaQuery.removeEventListener).toHaveBeenCalled();
  });
});
