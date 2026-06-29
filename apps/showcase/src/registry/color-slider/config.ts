import type { ComponentRegistryConfig } from "../types";
import { normalizeColorSliderValues } from "./normalize";

export const colorSliderConfig: ComponentRegistryConfig = {
  name: "Color Slider",
  slug: "color-slider",
  category: "color",
  description:
    "Adjust a single color channel on a gradient track. Supports hue, saturation, RGB, and alpha channels.",
  scale: 1,
  normalizeControlValues: normalizeColorSliderValues,
  controls: [
    { name: "aria-label", type: "string", defaultValue: "Hue" },
    {
      name: "channel",
      type: "enum",
      options: [
        "hue",
        "saturation",
        "brightness",
        "lightness",
        "red",
        "green",
        "blue",
        "alpha",
      ],
      defaultValue: "hue",
    },
    {
      name: "colorSpace",
      type: "enum",
      options: ["hsb", "hsl", "rgb"],
      defaultValue: "hsb",
    },
    { name: "isDisabled", type: "boolean", defaultValue: false },
    {
      name: "orientation",
      type: "enum",
      options: ["horizontal", "vertical"],
      defaultValue: "horizontal",
    },
    { name: "defaultValue", type: "string", defaultValue: "#6366f1" },
  ],
};
