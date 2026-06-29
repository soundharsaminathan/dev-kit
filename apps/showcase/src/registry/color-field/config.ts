import type { ComponentRegistryConfig } from "../types";

export const colorFieldConfig: ComponentRegistryConfig = {
  name: "Color Field",
  slug: "color-field",
  category: "color",
  description: "Color Field component showcase.",
  controls: [
    { name: "aria-label", type: "string", defaultValue: "Hex" },
    { name: "isDisabled", type: "boolean", defaultValue: false },
    { name: "isInvalid", type: "boolean", defaultValue: false },
    { name: "defaultValue", type: "string", defaultValue: "#6366f1" },
  ],
};
