import type { ComponentRegistryConfig } from "../types";

export const tooltipConfig: ComponentRegistryConfig = {
  name: "Tooltip",
  slug: "tooltip",
  category: "overlays",
  description: "Tooltip component showcase.",
  controls: [
    { name: "triggerLabel", type: "string", defaultValue: "Hover or tap me" },
    { name: "content", type: "string", defaultValue: "Add to library" },
  ],
};
