import { act, renderHook } from "@testing-library/react";
import type { TransitionEvent } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useOverlayExit } from "../use-overlay-exit";

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
    media: "(prefers-reduced-motion: reduce)",
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

describe("useOverlayExit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    const mediaQuery = createMediaQueryList(false);
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn(() => mediaQuery),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders when open", () => {
    const { result } = renderHook(() => useOverlayExit(true, 200));

    expect(result.current.isRendered).toBe(true);
    expect(result.current.dataState).toBe("open");
  });

  it("does not render when initially closed", () => {
    const { result } = renderHook(() => useOverlayExit(false, 200));

    expect(result.current.isRendered).toBe(false);
    expect(result.current.dataState).toBe("closed");
  });

  it("enters closing state then unmounts after duration", () => {
    const { result, rerender } = renderHook(
      ({ isOpen }) => useOverlayExit(isOpen, 200),
      { initialProps: { isOpen: true } },
    );

    rerender({ isOpen: false });

    expect(result.current.isRendered).toBe(true);
    expect(result.current.dataState).toBe("closing");

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current.isRendered).toBe(false);
    expect(result.current.dataState).toBe("closed");
  });

  it("reopens during closing", () => {
    const { result, rerender } = renderHook(
      ({ isOpen }) => useOverlayExit(isOpen, 200),
      { initialProps: { isOpen: true } },
    );

    rerender({ isOpen: false });
    rerender({ isOpen: true });

    expect(result.current.isRendered).toBe(true);
    expect(result.current.dataState).toBe("open");
  });

  it("closes immediately when reduced motion is preferred", () => {
    const mediaQuery = createMediaQueryList(true);
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn(() => mediaQuery),
    });

    const { result, rerender } = renderHook(
      ({ isOpen }) => useOverlayExit(isOpen, 200),
      { initialProps: { isOpen: true } },
    );

    rerender({ isOpen: false });

    expect(result.current.exitDurationMs).toBe(0);
    expect(result.current.isRendered).toBe(false);
    expect(result.current.dataState).toBe("closed");
  });

  it("unmounts on transition end while closing", () => {
    const { result, rerender } = renderHook(
      ({ isOpen }) => useOverlayExit(isOpen, 200),
      { initialProps: { isOpen: true } },
    );

    rerender({ isOpen: false });

    const element = document.createElement("div");
    act(() => {
      result.current.onTransitionEnd({
        target: element,
        currentTarget: element,
      } as unknown as TransitionEvent<HTMLElement>);
    });

    expect(result.current.isRendered).toBe(false);
    expect(result.current.dataState).toBe("closed");
  });

  it("ignores transition end from child elements", () => {
    const { result, rerender } = renderHook(
      ({ isOpen }) => useOverlayExit(isOpen, 200),
      { initialProps: { isOpen: true } },
    );

    rerender({ isOpen: false });

    const parent = document.createElement("div");
    const child = document.createElement("span");
    act(() => {
      result.current.onTransitionEnd({
        target: child,
        currentTarget: parent,
      } as unknown as TransitionEvent<HTMLElement>);
    });

    expect(result.current.isRendered).toBe(true);
    expect(result.current.dataState).toBe("closing");
  });

  it("ignores transition end when not closing", () => {
    const { result } = renderHook(() => useOverlayExit(true, 200));
    const element = document.createElement("div");

    act(() => {
      result.current.onTransitionEnd({
        target: element,
        currentTarget: element,
      } as unknown as TransitionEvent<HTMLElement>);
    });

    expect(result.current.isRendered).toBe(true);
    expect(result.current.dataState).toBe("open");
  });

  it("defaults to true when matchMedia is unavailable", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: undefined,
    });

    const { result } = renderHook(() => useOverlayExit(true, 200));

    expect(result.current.isRendered).toBe(true);
  });

  it("defaults to false snapshot when matchMedia is not a function", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: {},
    });

    const { result, rerender } = renderHook(
      ({ isOpen }) => useOverlayExit(isOpen, 200),
      { initialProps: { isOpen: true } },
    );

    rerender({ isOpen: false });

    expect(result.current.exitDurationMs).toBe(200);
    expect(result.current.dataState).toBe("closing");
  });

  it("ignores transition end when exit duration is zero", () => {
    const mediaQuery = createMediaQueryList(true);
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn(() => mediaQuery),
    });

    const { result, rerender } = renderHook(
      ({ isOpen }) => useOverlayExit(isOpen, 200),
      { initialProps: { isOpen: true } },
    );

    rerender({ isOpen: false });

    const element = document.createElement("div");
    act(() => {
      result.current.onTransitionEnd({
        target: element,
        currentTarget: element,
      } as unknown as TransitionEvent<HTMLElement>);
    });

    expect(result.current.isRendered).toBe(false);
    expect(result.current.dataState).toBe("closed");
  });

  it("keeps closed state when close is requested while unmounted", () => {
    const { result, rerender } = renderHook(
      ({ isOpen }) => useOverlayExit(isOpen, 200),
      { initialProps: { isOpen: false } },
    );

    rerender({ isOpen: false });

    expect(result.current.isRendered).toBe(false);
    expect(result.current.dataState).toBe("closed");
  });
});
