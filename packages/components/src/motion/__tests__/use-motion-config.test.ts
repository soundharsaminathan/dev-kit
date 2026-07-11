import { renderHook } from "@testing-library/react";
import { useReducedMotion } from "motion/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMotionConfig } from "../use-motion-config";

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

describe("useMotionConfig", () => {
  afterEach(() => {
    vi.mocked(useReducedMotion).mockReturnValue(true);
  });

  it.each([
    {
      reduced: true,
      canHover: true,
      expected: {
        reducedMotion: true,
        canHover: true,
        motionEnabled: false,
        hoverMotionEnabled: false,
      },
    },
    {
      reduced: false,
      canHover: true,
      expected: {
        reducedMotion: false,
        canHover: true,
        motionEnabled: true,
        hoverMotionEnabled: true,
      },
    },
    {
      reduced: false,
      canHover: false,
      expected: {
        reducedMotion: false,
        canHover: false,
        motionEnabled: true,
        hoverMotionEnabled: false,
      },
    },
    {
      reduced: null,
      canHover: true,
      expected: {
        reducedMotion: false,
        canHover: true,
        motionEnabled: true,
        hoverMotionEnabled: true,
      },
    },
  ])("maps reduced=$reduced canHover=$canHover to motion flags", ({
    reduced,
    canHover,
    expected,
  }) => {
    vi.mocked(useReducedMotion).mockReturnValue(reduced);
    mockHoverMedia(canHover);

    const { result } = renderHook(() => useMotionConfig());
    expect(result.current).toEqual(expected);
  });
});
