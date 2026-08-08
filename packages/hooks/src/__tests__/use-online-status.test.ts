import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useOnlineStatus } from "../use-online-status";

describe("useOnlineStatus", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reflects the initial navigator.onLine value", () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(true);
  });

  it("updates to false when the offline event fires", () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });

    const { result } = renderHook(() => useOnlineStatus());

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(result.current).toBe(false);
  });

  it("updates to true when the online event fires", () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: false,
    });

    const { result } = renderHook(() => useOnlineStatus());

    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    expect(result.current).toBe(true);
  });

  it("removes online/offline listeners on unmount", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() => useOnlineStatus());
    unmount();

    const addedEvents = addSpy.mock.calls.map((call) => call[0]);
    const removedEvents = removeSpy.mock.calls.map((call) => call[0]);

    expect(addedEvents).toEqual(expect.arrayContaining(["online", "offline"]));
    expect(removedEvents).toEqual(
      expect.arrayContaining(["online", "offline"]),
    );
  });
});
