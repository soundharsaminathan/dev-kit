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
  ],
};
