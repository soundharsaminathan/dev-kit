import { describe, expect, it } from "vitest";
import {
  getFadeUpVariants,
  getPopVariants,
  getPresetVariants,
  getStaggerItem,
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

  it("returns placement-aware tooltip variants", () => {
    const top = getTooltipVariants(false, "top");
    expect(top.initial).toMatchObject({ y: 10 });

    const left = getTooltipVariants(false, "left");
    expect(left.initial).toMatchObject({ x: 10 });
  });

  it("resolves preset names", () => {
    expect(getPresetVariants("fade", false).animate).toEqual({ opacity: 1 });
    expect(getPresetVariants("dialog", false).initial).toMatchObject({
      scale: 0.97,
    });
  });

  it("returns stagger item blur when not reduced", () => {
    expect(getStaggerItem(false).hidden).toMatchObject({ filter: "blur(3px)" });
    expect(getStaggerItem(true).show).toEqual({ opacity: 1 });
  });
});
