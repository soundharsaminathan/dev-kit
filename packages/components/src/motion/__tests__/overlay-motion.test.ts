import { describe, expect, it } from "vitest";
import {
  getBackdropMotion,
  getModalPanelMotion,
  getPopoverPanelMotion,
  getToastItemMotion,
} from "../overlay-motion";

describe("overlay-motion", () => {
  it("returns opacity-only backdrop motion when reduced", () => {
    expect(getBackdropMotion(true)).toEqual({
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    });
  });

  it("returns scale panel motion for modal when not reduced", () => {
    const motion = getModalPanelMotion(false);
    expect(motion.initial).toMatchObject({ opacity: 0, scale: 0.97, y: 20 });
    expect(motion.animate).toMatchObject({ opacity: 1, scale: 1, y: 0 });
  });

  it("returns placement-aware popover motion", () => {
    const bottom = getPopoverPanelMotion("bottom", false);
    expect(bottom.initial).toMatchObject({ y: -8 });

    const top = getPopoverPanelMotion("top", false);
    expect(top.initial).toMatchObject({ y: 8 });
  });

  it("returns position-aware toast motion", () => {
    const topRight = getToastItemMotion("top-right", false);
    expect(topRight.initial).toMatchObject({ y: -40 });

    const bottomLeft = getToastItemMotion("bottom-left", false);
    expect(bottomLeft.initial).toMatchObject({ x: -40 });
  });
});
