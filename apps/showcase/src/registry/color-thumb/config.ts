import type { ComponentRegistryConfig } from "../types";

export const colorThumbConfig: ComponentRegistryConfig = {
  name: "Color Thumb",
  slug: "color-thumb",
  category: "color",
  description: "Color Thumb component showcase.",
  controls: [
    {
      name: "aria-label",
      type: "string",
      defaultValue: "Saturation and brightness",
    },
    { name: "defaultValue", type: "string", defaultValue: "#6366f1" },
    { name: "isDisabled", type: "boolean", defaultValue: false },
  ],
};
