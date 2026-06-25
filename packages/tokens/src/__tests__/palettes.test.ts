import { describe, expect, it } from "vitest";
import {
  ACCENT_KERNEL_NAME,
  fromKernelPaletteName,
  PALETTE_ORDER,
  STATUS_PALETTES,
  toKernelPaletteName,
} from "../theme/palettes.js";

describe("palettes", () => {
  it("exposes palette metadata", () => {
    expect(PALETTE_ORDER).toContain("accent");
    expect(STATUS_PALETTES).toEqual(["success", "warning", "danger", "info"]);
    expect(ACCENT_KERNEL_NAME).toBe("primary");
  });

  it("maps accent palette names for the color kernel", () => {
    expect(toKernelPaletteName("accent")).toBe("primary");
    expect(toKernelPaletteName("neutral")).toBe("neutral");
    expect(fromKernelPaletteName("primary")).toBe("accent");
    expect(fromKernelPaletteName("neutral")).toBe("neutral");
  });
});
