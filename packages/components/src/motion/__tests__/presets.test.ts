import { describe, expect, it } from "vitest";
import { EASE_OUT, SPRING_LAYOUT, SPRING_PANEL, SPRING_SWAP } from "../ease";
import {
  getFadeDownVariants,
  getFadeUpVariants,
  getFadeVariants,
  getLayoutTransition,
  getPopVariants,
  getPresetExitTransition,
  getPresetTransition,
  getPresetVariants,
  getScaleVariants,
  getStaggerContainer,
  getStaggerItem,
  getSwapTransition,
  getTooltipVariants,
} from "../presets";

describe("motion presets", () => {
  it("returns opacity-only variants when reduced", () => {
    expect(getFadeUpVariants(true)).toEqual({
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    });
  });

  it("returns transform variants when not reduced", () => {
    const motion = getPopVariants(false);
    expect(motion.initial).toMatchObject({ scale: 0.85 });
    expect(motion.animate).toMatchObject({ scale: 1 });
  });

  it("returns fade variants for reduced and full motion", () => {
    expect(getFadeVariants(true).initial).toEqual({ opacity: 0 });
    expect(getFadeVariants(false).initial).toEqual({ opacity: 0 });
  });

  it("returns fade down variants with distance", () => {
    const motion = getFadeDownVariants(false, 12);
    expect(motion.initial).toMatchObject({ y: -12 });
    expect(getFadeDownVariants(true).animate).toEqual({ opacity: 1 });
  });

  it("returns scale variants when not reduced", () => {
    const motion = getScaleVariants(false);
    expect(motion.initial).toMatchObject({ scale: 0.97 });
    expect(motion.exit).toMatchObject({ scale: 0.98 });
  });

  it("returns placement-aware tooltip variants", () => {
    const top = getTooltipVariants(false, "top");
    expect(top.initial).toMatchObject({ y: 10 });

    const left = getTooltipVariants(false, "left");
    expect(left.initial).toMatchObject({ x: 10 });

    const start = getTooltipVariants(false, "start");
    expect(start.initial).toMatchObject({ x: 10 });

    const right = getTooltipVariants(false, "right");
    expect(right.initial).toMatchObject({ x: -10 });

    const end = getTooltipVariants(false, "end");
    expect(end.initial).toMatchObject({ x: -10 });

    const bottom = getTooltipVariants(false, "bottom");
    expect(bottom.initial).toMatchObject({ y: -10 });
  });

  it("resolves preset names", () => {
    expect(getPresetVariants("fade", false).animate).toEqual({ opacity: 1 });
    expect(getPresetVariants("dialog", false).initial).toMatchObject({
      scale: 0.97,
    });
    expect(
      getPresetVariants("fadeUp", false, { distance: 8 }).initial,
    ).toMatchObject({
      y: 8,
    });
    expect(getPresetVariants("fadeDown", false).initial).toMatchObject({
      y: -20,
    });
    expect(getPresetVariants("scale", false).initial).toMatchObject({
      scale: 0.97,
    });
    expect(getPresetVariants("pop", false).initial).toMatchObject({
      scale: 0.85,
    });
    expect(getPresetVariants("menu", false).initial).toMatchObject({
      scale: 0.85,
    });
    expect(
      getPresetVariants("toast", false, { distance: 24 }).initial,
    ).toMatchObject({
      y: 24,
    });
    expect(
      getPresetVariants("tooltip", false, { placement: "top" }).initial,
    ).toMatchObject({
      y: 10,
    });
  });

  it("returns stagger container and item variants", () => {
    expect(getStaggerContainer(false).hidden).toEqual({ opacity: 0 });
    expect(getStaggerContainer(true).hidden).toEqual({ opacity: 1 });
    expect(getStaggerItem(false).hidden).toMatchObject({ filter: "blur(3px)" });
    expect(getStaggerItem(true).show).toEqual({ opacity: 1 });
  });

  it("returns preset transitions", () => {
    expect(getPresetTransition("tooltip", false)).toBe(SPRING_PANEL);
    expect(getPresetTransition("menu", false)).toBe(SPRING_PANEL);
    expect(getPresetTransition("pop", false)).toBe(SPRING_PANEL);
    expect(getPresetTransition("dialog", false)).toBe(SPRING_PANEL);
    expect(getPresetTransition("fade", false)).toBe(SPRING_PANEL);
    expect(getPresetTransition("toast", false)).toEqual({
      duration: 0.35,
      ease: EASE_OUT,
    });
    expect(getPresetTransition("fade", true)).toEqual({
      duration: 0.2,
      ease: EASE_OUT,
    });
  });

  it("returns preset exit transitions", () => {
    expect(getPresetExitTransition("tooltip", false)).toEqual({
      duration: 0.14,
      ease: EASE_OUT,
    });
    expect(getPresetExitTransition("fade", false)).toEqual({
      duration: 0.18,
      ease: EASE_OUT,
    });
    expect(getPresetExitTransition("fade", true)).toEqual({
      duration: 0.14,
      ease: EASE_OUT,
    });
  });

  it("returns layout and swap transitions", () => {
    expect(getLayoutTransition(false)).toBe(SPRING_LAYOUT);
    expect(getLayoutTransition(true)).toEqual({ duration: 0 });
    expect(getSwapTransition(false)).toBe(SPRING_SWAP);
    expect(getSwapTransition(true)).toEqual({ duration: 0 });
  });

  it("falls back to fade variants for unknown presets", () => {
    expect(getPresetVariants("unknown" as "fade", false).animate).toEqual({
      opacity: 1,
    });
  });

  it("applies default distance and placement for toast and tooltip presets", () => {
    expect(getPresetVariants("toast", false).initial).toMatchObject({ y: 40 });
    expect(getPresetVariants("tooltip", false).initial).toMatchObject({
      y: -10,
    });
  });

  it("returns reduced stagger show transition", () => {
    expect(getStaggerContainer(true).show.transition).toEqual({ duration: 0 });
    expect(getStaggerContainer(false).show.transition).toEqual({
      staggerChildren: 0.035,
      delayChildren: 0.05,
    });
  });

  it("treats null reduced as full motion for layout helpers", () => {
    expect(getLayoutTransition(null)).toBe(SPRING_LAYOUT);
    expect(getSwapTransition(null)).toBe(SPRING_SWAP);
    expect(getFadeUpVariants(null).initial).toMatchObject({ y: 20 });
  });
});
