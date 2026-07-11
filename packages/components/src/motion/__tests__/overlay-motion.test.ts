import { describe, expect, it } from "vitest";
import { EASE_OUT, SPRING_PANEL } from "../ease";
import {
  getBackdropMotion,
  getBackdropTransition,
  getModalPanelMotion,
  getOverlayTransition,
  getPopoverPanelMotion,
  getToastItemMotion,
  getToastItemTransition,
} from "../overlay-motion";

const CUSTOM_SPRING = {
  type: "spring",
  stiffness: 100,
  damping: 20,
  mass: 1,
} as unknown as typeof SPRING_PANEL;

describe("overlay-motion", () => {
  it("returns opacity-only backdrop motion when reduced", () => {
    expect(getBackdropMotion(true)).toEqual({
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    });
  });

  it("returns backdrop transition durations", () => {
    expect(getBackdropTransition(true)).toEqual({
      duration: 0,
      ease: EASE_OUT,
    });
    expect(getBackdropTransition(false)).toEqual({
      duration: 0.2,
      ease: EASE_OUT,
    });
  });

  it("returns scale panel motion for modal when not reduced", () => {
    const motion = getModalPanelMotion(false);
    expect(motion.initial).toMatchObject({ opacity: 0, scale: 0.97, y: 20 });
    expect(motion.animate).toMatchObject({ opacity: 1, scale: 1, y: 0 });
  });

  it("returns opacity-only modal motion when reduced", () => {
    expect(getModalPanelMotion(true).initial).toEqual({ opacity: 0 });
  });

  it("returns placement-aware popover motion", () => {
    const bottom = getPopoverPanelMotion("bottom", false);
    expect(bottom.initial).toMatchObject({ y: -8 });

    const top = getPopoverPanelMotion("top", false);
    expect(top.initial).toMatchObject({ y: 8 });

    const left = getPopoverPanelMotion("left", false);
    expect(left.initial).toMatchObject({ x: 8 });

    const right = getPopoverPanelMotion("right", false);
    expect(right.initial).toMatchObject({ x: -8 });

    expect(getPopoverPanelMotion("bottom", true).initial).toEqual({
      opacity: 0,
    });
  });

  it("returns position-aware toast motion", () => {
    const topRight = getToastItemMotion("top-right", false);
    expect(topRight.initial).toMatchObject({ y: -40 });

    const bottomLeft = getToastItemMotion("bottom-left", false);
    expect(bottomLeft.initial).toMatchObject({ x: -40 });

    const bottomCenter = getToastItemMotion("bottom-center", false);
    expect(bottomCenter.initial).toMatchObject({ x: 40 });

    const bottomRight = getToastItemMotion("bottom-right", false);
    expect(bottomRight.initial).toMatchObject({ x: 40 });

    expect(getToastItemMotion("bottom-left", true).initial).toEqual({
      opacity: 0,
    });
  });

  it("resolves start and end popover placements", () => {
    const start = getPopoverPanelMotion("start top", false);
    expect(start.initial).toMatchObject({ x: 8 });

    const end = getPopoverPanelMotion("end bottom", false);
    expect(end.initial).toMatchObject({ x: -8 });
  });

  it("returns overlay and toast transitions", () => {
    expect(getOverlayTransition(true)).toEqual({
      duration: 0.2,
      ease: EASE_OUT,
    });
    expect(getOverlayTransition(false)).toBe(SPRING_PANEL);
    expect(getOverlayTransition(null)).toBe(SPRING_PANEL);
    expect(getOverlayTransition(false, CUSTOM_SPRING)).toBe(CUSTOM_SPRING);
    expect(getToastItemTransition(true)).toEqual({
      duration: 0.2,
      ease: EASE_OUT,
    });
    expect(getToastItemTransition(false)).toEqual({
      duration: 0.35,
      ease: EASE_OUT,
    });
  });

  it("treats null reduced as full motion for panels and toasts", () => {
    expect(getModalPanelMotion(null).initial).toMatchObject({ scale: 0.97 });
    expect(getPopoverPanelMotion("top start", null).initial).toMatchObject({
      y: 8,
    });
    expect(getBackdropTransition(null)).toEqual({
      duration: 0.2,
      ease: EASE_OUT,
    });
    expect(getToastItemMotion("top-left", null).initial).toMatchObject({
      y: -40,
    });
  });

  it("falls back for unrecognized toast positions", () => {
    const motion = getToastItemMotion("bottom" as "bottom-center", false);
    expect(motion.initial).toMatchObject({ y: 40 });
  });
});
