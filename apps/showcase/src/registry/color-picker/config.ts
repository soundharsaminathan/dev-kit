import type { ComponentRegistryConfig } from "../types";

export const colorPickerConfig: ComponentRegistryConfig = {
  name: "Color Picker",
  slug: "color-picker",
  category: "color",
  description: "Color Picker component showcase.",
  controls: [
    { name: "defaultOpen", type: "boolean", defaultValue: false },
    { name: "defaultValue", type: "string", defaultValue: "#6366f1" },
  ],
};
