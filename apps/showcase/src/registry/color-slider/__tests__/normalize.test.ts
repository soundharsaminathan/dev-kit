import { describe, expect, it } from "vitest";
import {
  normalizeColorSliderChannel,
  normalizeColorSliderValues,
} from "../normalize";

describe("normalizeColorSliderChannel", () => {
  it("keeps valid hsb channels", () => {
    expect(normalizeColorSliderChannel("brightness", "hsb")).toBe("brightness");
  });

  it("maps brightness to lightness for hsl", () => {
    expect(normalizeColorSliderChannel("brightness", "hsl")).toBe("lightness");
  });

  it("maps lightness to brightness for hsb", () => {
    expect(normalizeColorSliderChannel("lightness", "hsb")).toBe("brightness");
  });

  it("falls back to hue when channel is invalid for hsl", () => {
    expect(normalizeColorSliderChannel("red", "hsl")).toBe("hue");
  });

  it("falls back to red when channel is invalid for rgb", () => {
    expect(normalizeColorSliderChannel("hue", "rgb")).toBe("red");
  });

  it("keeps alpha for every color space", () => {
    expect(normalizeColorSliderChannel("alpha", "hsl")).toBe("alpha");
    expect(normalizeColorSliderChannel("alpha", "rgb")).toBe("alpha");
  });
});

describe("normalizeColorSliderValues", () => {
  it("normalizes channel when color space changes to hsl", () => {
    expect(
      normalizeColorSliderValues({
        colorSpace: "hsl",
        channel: "brightness",
      }),
    ).toMatchObject({
      colorSpace: "hsl",
      channel: "lightness",
    });
  });
});
