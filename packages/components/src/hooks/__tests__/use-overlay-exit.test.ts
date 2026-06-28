import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useOverlayExit } from "../use-overlay-exit";

describe("useOverlayExit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
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
});
