import { describe, expect, it, vi } from "vitest";
import { readCssNumber } from "../read-css-number";

describe("readCssNumber", () => {
  it("parses a numeric CSS custom property", () => {
    const element = document.createElement("div");
    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      getPropertyValue: () => "1.05",
    } as unknown as CSSStyleDeclaration);

    expect(readCssNumber(element, "--btn-hover-scale")).toBe(1.05);
  });

  it("returns undefined for non-numeric values", () => {
    const element = document.createElement("div");
    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      getPropertyValue: () => "auto",
    } as unknown as CSSStyleDeclaration);

    expect(readCssNumber(element, "--btn-hover-scale")).toBeUndefined();
  });
});
