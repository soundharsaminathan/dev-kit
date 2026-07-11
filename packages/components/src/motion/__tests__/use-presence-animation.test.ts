import { renderHook } from "@testing-library/react";
import { useReducedMotion } from "motion/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SPRING_PANEL } from "../ease";
import { usePresenceAnimation } from "../use-presence-animation";

describe("usePresenceAnimation", () => {
  afterEach(() => {
    vi.mocked(useReducedMotion).mockReturnValue(true);
  });

  it.each([
    "backdrop",
    "modal",
    "popover",
    "toast",
    "tooltip",
    "fade",
    "menu",
  ] as const)("returns reduced motion config for %s preset", (preset) => {
    const { result } = renderHook(() =>
      usePresenceAnimation(preset, {
        placement: "top",
        toastPosition: "top-right",
      }),
    );

    expect(result.current.reducedMotion).toBe(true);
    expect(result.current.motion.initial).toEqual({ opacity: 0 });
    expect(result.current.transition).toBeDefined();
    expect(result.current.exitTransition).toBeDefined();
  });

  it("uses default placement and toast position when options are omitted", () => {
    const { result: popover } = renderHook(() =>
      usePresenceAnimation("popover"),
    );
    expect(popover.current.motion.initial).toEqual({ opacity: 0 });

    const { result: toast } = renderHook(() => usePresenceAnimation("toast"));
    expect(toast.current.motion.initial).toEqual({ opacity: 0 });
  });

  it("returns full motion variants when reduced motion is off", () => {
    vi.mocked(useReducedMotion).mockReturnValue(false);

    const { result: modal } = renderHook(() => usePresenceAnimation("modal"));
    expect(modal.current.reducedMotion).toBe(false);
    expect(modal.current.motion.initial).toMatchObject({
      opacity: 0,
      scale: 0.97,
      y: 20,
    });
    expect(modal.current.transition).toBe(SPRING_PANEL);

    const { result: popover } = renderHook(() =>
      usePresenceAnimation("popover", { placement: "left" }),
    );
    expect(popover.current.motion.initial).toMatchObject({ x: 8 });

    const { result: toast } = renderHook(() =>
      usePresenceAnimation("toast", { toastPosition: "top-left" }),
    );
    expect(toast.current.motion.initial).toMatchObject({ y: -40 });

    const { result: fadeUp } = renderHook(() =>
      usePresenceAnimation("fadeUp", { distance: 12 }),
    );
    expect(fadeUp.current.motion.initial).toMatchObject({ y: 12 });
  });
});
