import { renderHook } from "@testing-library/react";
import { useReducedMotion } from "motion/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useHoverAnimation } from "../use-hover-animation";

function mockHoverMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn((query: string) => ({
      matches: query.includes("hover") ? matches : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe("useHoverAnimation", () => {
  afterEach(() => {
    vi.mocked(useReducedMotion).mockReturnValue(true);
  });

  it("returns true when hover animation is enabled", () => {
    vi.mocked(useReducedMotion).mockReturnValue(false);
    mockHoverMedia(true);

    const { result } = renderHook(() => useHoverAnimation(true));
    expect(result.current).toBe(true);
  });

  it("returns false when the hook is disabled", () => {
    vi.mocked(useReducedMotion).mockReturnValue(false);
    mockHoverMedia(true);

    const { result } = renderHook(() => useHoverAnimation(false));
    expect(result.current).toBe(false);
  });

  it("returns false when hover motion is disabled in config", () => {
    vi.mocked(useReducedMotion).mockReturnValue(false);
    mockHoverMedia(false);

    const { result } = renderHook(() => useHoverAnimation(true));
    expect(result.current).toBe(false);
  });
});
