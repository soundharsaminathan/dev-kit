import { act, renderHook } from "@testing-library/react";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCanHover } from "../use-can-hover";

function createMediaQueryList(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<() => void>();

  return {
    get matches() {
      return matches;
    },
    set matches(value: boolean) {
      matches = value;
    },
    media: "(hover: hover) and (pointer: fine)",
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

describe("useCanHover", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns true when the hover media query matches", () => {
    const mediaQuery = createMediaQueryList(true);
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn(() => mediaQuery),
    });

    const { result } = renderHook(() => useCanHover());

    expect(result.current).toBe(true);
    expect(mediaQuery.addEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );
  });

  it("returns false when the hover media query does not match", () => {
    const mediaQuery = createMediaQueryList(false);
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn(() => mediaQuery),
    });

    const { result } = renderHook(() => useCanHover());

    expect(result.current).toBe(false);
  });

  it("updates when the media query changes", () => {
    const mediaQuery = createMediaQueryList(true);
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn(() => mediaQuery),
    });

    const { result } = renderHook(() => useCanHover());

    act(() => {
      mediaQuery.matches = false;
      mediaQuery.dispatchChange();
    });

    expect(result.current).toBe(false);
  });

  it("defaults to true when matchMedia is unavailable", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: undefined,
    });

    const { result } = renderHook(() => useCanHover());

    expect(result.current).toBe(true);
  });

  it("defaults to true when matchMedia is not a function", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: {},
    });

    const { result } = renderHook(() => useCanHover());

    expect(result.current).toBe(true);
  });

  it("uses a server snapshot of true during SSR", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn(() => createMediaQueryList(false)),
    });

    function CanHoverProbe() {
      const canHover = useCanHover();
      return `<span>${canHover}</span>`;
    }

    expect(renderToString(createElement(CanHoverProbe))).toContain("true");
  });

  it("cleans up media query listeners on unmount", () => {
    const mediaQuery = createMediaQueryList(true);
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn(() => mediaQuery),
    });

    const { unmount } = renderHook(() => useCanHover());

    unmount();

    expect(mediaQuery.removeEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );
  });
});
