import type { ComponentRegistryConfig } from "../types";

export const progressBarConfig: ComponentRegistryConfig = {
  name: "Progress Bar",
  slug: "progress-bar",
  category: "typography",
  description: "Progress Bar component showcase.",
  controls: [
    { name: "minValue", type: "number", defaultValue: 0 },
    { name: "maxValue", type: "number", defaultValue: 100 },
    { name: "isIndeterminate", type: "boolean", defaultValue: false },
    { name: "aria-label", type: "string", defaultValue: "Upload progress" },
    { name: "value", type: "number", defaultValue: 60 },
  ],
};
