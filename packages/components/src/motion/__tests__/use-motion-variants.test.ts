import { renderHook } from "@testing-library/react";
import { useReducedMotion } from "motion/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SPRING_PANEL } from "../ease";
import {
  useCustomMotionVariants,
  useMotionVariants,
} from "../use-motion-variants";

describe("useMotionVariants", () => {
  afterEach(() => {
    vi.mocked(useReducedMotion).mockReturnValue(true);
  });

  it.each([
    "fade",
    "fadeUp",
    "tooltip",
    "toast",
    "dialog",
  ] as const)("returns reduced variants for %s preset", (preset) => {
    const { result } = renderHook(() =>
      useMotionVariants(preset, { placement: "top", distance: 12 }),
    );

    expect(result.current.reducedMotion).toBe(true);
    expect(result.current.variants.initial).toEqual({ opacity: 0 });
    expect(result.current.transition).toBeDefined();
    expect(result.current.exitTransition).toBeDefined();
  });

  it("returns full motion variants when reduced motion is off", () => {
    vi.mocked(useReducedMotion).mockReturnValue(false);

    const { result } = renderHook(() =>
      useMotionVariants("fadeUp", { distance: 16 }),
    );

    expect(result.current.reducedMotion).toBe(false);
    expect(result.current.variants.initial).toMatchObject({ y: 16 });
    expect(result.current.transition).toBe(SPRING_PANEL);
  });

  it("returns custom variants and transition", () => {
    const { result } = renderHook(() =>
      useCustomMotionVariants(
        (reduced) =>
          reduced
            ? {
                initial: { opacity: 0 },
                animate: { opacity: 1 },
                exit: { opacity: 0 },
              }
            : {
                initial: { opacity: 0, y: 4 },
                animate: { opacity: 1, y: 0 },
                exit: { opacity: 0, y: 4 },
              },
        (reduced) => ({ duration: reduced ? 0.1 : 0.3 }),
      ),
    );

    expect(result.current.reducedMotion).toBe(true);
    expect(result.current.variants.animate).toEqual({ opacity: 1 });
    expect(result.current.transition).toEqual({ duration: 0.1 });
  });

  it("returns custom full-motion variants when reduced motion is off", () => {
    vi.mocked(useReducedMotion).mockReturnValue(false);

    const { result } = renderHook(() =>
      useCustomMotionVariants(
        (reduced) =>
          reduced
            ? {
                initial: { opacity: 0 },
                animate: { opacity: 1 },
                exit: { opacity: 0 },
              }
            : {
                initial: { opacity: 0, y: 4 },
                animate: { opacity: 1, y: 0 },
                exit: { opacity: 0, y: 4 },
              },
        (reduced) => ({ duration: reduced ? 0.1 : 0.3 }),
      ),
    );

    expect(result.current.reducedMotion).toBe(false);
    expect(result.current.variants.initial).toMatchObject({ y: 4 });
    expect(result.current.transition).toEqual({ duration: 0.3 });
  });

  it("falls back to default transition for custom variants", () => {
    const { result } = renderHook(() =>
      useCustomMotionVariants(() => ({
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      })),
    );

    expect(result.current.transition).toEqual({ duration: 0.2 });
  });

  it("falls back to undefined duration when motion is not reduced", () => {
    vi.mocked(useReducedMotion).mockReturnValue(false);

    const { result } = renderHook(() =>
      useCustomMotionVariants(() => ({
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      })),
    );

    expect(result.current.transition).toEqual({ duration: undefined });
  });
});
