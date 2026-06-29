import type { ComponentRegistryConfig } from "../types";

export const tooltipConfig: ComponentRegistryConfig = {
  name: "Tooltip",
  slug: "tooltip",
  category: "overlays",
  description: "Tooltip component showcase.",
  controls: [
    { name: "triggerLabel", type: "string", defaultValue: "Hover or tap me" },
    { name: "content", type: "string", defaultValue: "Add to library" },
    {
      name: "placement",
      type: "enum",
      options: ["top", "bottom", "left", "right"],
      defaultValue: "bottom",
    },
    { name: "fullWidth", type: "boolean", defaultValue: true },
    {
      name: "touchBehavior",
      type: "enum",
      options: ["toggle", "longPress"],
      defaultValue: "toggle",
    },
    { name: "delay", type: "number", defaultValue: 0 },
    { name: "closeDelay", type: "number", defaultValue: 0 },
  ],
};
