import type { ComponentRegistryConfig } from "../types";

export const colorAreaConfig: ComponentRegistryConfig = {
  name: "Color Area",
  slug: "color-area",
  category: "color",
  description: "Color Area component showcase.",
  controls: [
    {
      name: "aria-label",
      type: "string",
      defaultValue: "Saturation and brightness",
    },
    { name: "isDisabled", type: "boolean", defaultValue: false },
    { name: "defaultValue", type: "string", defaultValue: "#6366f1" },
    { name: "colorSpace", type: "string", defaultValue: "hsb" },
    { name: "xChannel", type: "string", defaultValue: "saturation" },
    { name: "yChannel", type: "string", defaultValue: "brightness" },
  ],
};
