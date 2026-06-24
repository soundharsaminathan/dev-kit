import type { ComponentRegistryConfig } from "../types";

export const overlayArrowConfig: ComponentRegistryConfig = {
  name: "Overlay Arrow",
  slug: "overlay-arrow",
  category: "overlays",
  description: "Overlay Arrow component showcase.",
  controls: [
    {
      name: "placement",
      type: "enum",
      options: ["top", "bottom", "left", "right"],
      defaultValue: "bottom",
    },
  ],
};
