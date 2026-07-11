import { describe, expect, it } from "vitest";
import {
  getDrawerPanelMotion,
  getDrawerPanelTransition,
} from "../drawer-motion";
import { EASE_OUT, SPRING_PANEL } from "../ease";

describe("drawer-motion", () => {
  it("returns opacity-only motion when reduced", () => {
    expect(getDrawerPanelMotion("bottom", true)).toEqual({
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    });
  });

  it.each([
    ["bottom", { y: "100%" }, { y: 0 }],
    ["top", { y: "-100%" }, { y: 0 }],
    ["left", { x: "-100%" }, { x: 0 }],
    ["right", { x: "100%" }, { x: 0 }],
  ] as const)("returns placement motion for %s", (placement, offset, animate) => {
    const motion = getDrawerPanelMotion(placement, false);
    expect(motion.initial).toMatchObject(offset);
    expect(motion.animate).toEqual(animate);
    expect(motion.exit).toMatchObject(offset);
  });

  it("returns reduced transition when motion is reduced", () => {
    expect(getDrawerPanelTransition(true)).toEqual({
      duration: 0.2,
      ease: EASE_OUT,
    });
  });

  it("returns spring transition when motion is not reduced", () => {
    expect(getDrawerPanelTransition(false)).toBe(SPRING_PANEL);
  });

  it("treats null reduced as full motion", () => {
    expect(getDrawerPanelMotion("bottom", null).initial).toMatchObject({
      y: "100%",
    });
    expect(getDrawerPanelTransition(null)).toBe(SPRING_PANEL);
  });
});
