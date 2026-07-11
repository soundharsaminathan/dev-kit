import { renderHook } from "@testing-library/react";
import { useReducedMotion } from "motion/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SPRING_PRESS } from "../ease";
import { usePressAnimation } from "../use-press-animation";

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

function mockCssScales(hover: string, press: string) {
  vi.spyOn(window, "getComputedStyle").mockReturnValue({
    getPropertyValue: (name: string) =>
      name === "--btn-hover-scale" ? hover : press,
  } as unknown as CSSStyleDeclaration);
}

describe("usePressAnimation", () => {
  afterEach(() => {
    vi.mocked(useReducedMotion).mockReturnValue(true);
  });

  it("returns disabled motion when press animation is disabled", () => {
    vi.mocked(useReducedMotion).mockReturnValue(false);
    mockHoverMedia(true);

    const ref = createRef<HTMLButtonElement>();
    const { result } = renderHook(() =>
      usePressAnimation(ref, { enabled: false }),
    );

    expect(result.current.enabled).toBe(false);
    expect(result.current.motionProps).toEqual({});
  });

  it("returns disabled motion when motion config disables motion", () => {
    vi.mocked(useReducedMotion).mockReturnValue(true);
    mockHoverMedia(true);

    const ref = createRef<HTMLButtonElement>();
    const button = document.createElement("button");
    ref.current = button;
    mockCssScales("1.02", "0.98");

    const { result } = renderHook(() => usePressAnimation(ref));

    expect(result.current.enabled).toBe(false);
    expect(result.current.motionProps).toEqual({});
  });

  it("returns press and hover motion when CSS scales are available", () => {
    vi.mocked(useReducedMotion).mockReturnValue(false);
    mockHoverMedia(true);

    const ref = createRef<HTMLButtonElement>();
    const button = document.createElement("button");
    ref.current = button;
    mockCssScales("1.02", "0.98");

    const { result } = renderHook(() => usePressAnimation(ref));

    expect(result.current.enabled).toBe(true);
    expect(result.current.motionProps).toEqual({
      whileTap: { scale: 0.98 },
      whileHover: { scale: 1.02 },
      transition: SPRING_PRESS,
    });
  });

  it("omits whileHover when hover motion is disabled", () => {
    vi.mocked(useReducedMotion).mockReturnValue(false);
    mockHoverMedia(false);

    const ref = createRef<HTMLButtonElement>();
    const button = document.createElement("button");
    ref.current = button;
    mockCssScales("1.02", "0.98");

    const { result } = renderHook(() => usePressAnimation(ref));

    expect(result.current.enabled).toBe(true);
    expect(result.current.motionProps).toEqual({
      whileTap: { scale: 0.98 },
      transition: SPRING_PRESS,
    });
  });

  it("stays disabled when CSS scales are missing", () => {
    vi.mocked(useReducedMotion).mockReturnValue(false);
    mockHoverMedia(true);

    const ref = createRef<HTMLButtonElement>();
    const button = document.createElement("button");
    ref.current = button;
    mockCssScales("invalid", "invalid");

    const { result } = renderHook(() => usePressAnimation(ref));

    expect(result.current.enabled).toBe(false);
    expect(result.current.motionProps).toEqual({});
  });

  it("stays disabled when only one CSS scale is valid", () => {
    vi.mocked(useReducedMotion).mockReturnValue(false);
    mockHoverMedia(true);

    const ref = createRef<HTMLButtonElement>();
    const button = document.createElement("button");
    ref.current = button;
    mockCssScales("1.02", "auto");

    const { result } = renderHook(() => usePressAnimation(ref));

    expect(result.current.enabled).toBe(false);
  });

  it("skips reading scales when the ref element is null", () => {
    vi.mocked(useReducedMotion).mockReturnValue(false);
    mockHoverMedia(true);

    const ref = createRef<HTMLButtonElement>();
    const getComputedStyle = vi.spyOn(window, "getComputedStyle");
    getComputedStyle.mockClear();

    const { result } = renderHook(() => usePressAnimation(ref));

    expect(result.current.enabled).toBe(false);
    expect(getComputedStyle).not.toHaveBeenCalled();
  });
});
