import { describe, expect, it } from "vitest";
import { colorSliderConfig } from "@/registry/color-slider/config";
import { getCardPreviewProps } from "../preview-props";

describe("getCardPreviewProps", () => {
  it("normalizes color slider preview values", () => {
    const props = getCardPreviewProps({
      ...colorSliderConfig,
      controls: [
        ...colorSliderConfig.controls.filter(
          (control) =>
            control.name !== "channel" && control.name !== "colorSpace",
        ),
        {
          name: "channel",
          type: "enum",
          options: ["brightness"],
          defaultValue: "brightness",
        },
        {
          name: "colorSpace",
          type: "enum",
          options: ["hsl"],
          defaultValue: "hsl",
        },
      ],
    });

    expect(props).toMatchObject({
      colorSpace: "hsl",
      channel: "lightness",
    });
  });
});
