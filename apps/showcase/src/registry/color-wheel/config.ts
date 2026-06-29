import type { ComponentRegistryConfig } from "../types";

export const colorWheelConfig: ComponentRegistryConfig = {
  name: "Color Wheel",
  slug: "color-wheel",
  category: "color",
  description: "Color Wheel component showcase.",
  controls: [
    { name: "aria-label", type: "string", defaultValue: "Hue" },
    { name: "isDisabled", type: "boolean", defaultValue: false },
    { name: "defaultValue", type: "string", defaultValue: "#6366f1" },
  ],
};
