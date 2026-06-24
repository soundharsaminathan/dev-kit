import type { ComponentRegistryConfig } from "../types";

export const colorSwatchPickerConfig: ComponentRegistryConfig = {
  name: "Color Swatch Picker",
  slug: "color-swatch-picker",
  category: "color",
  description: "Color Swatch Picker component showcase.",
  controls: [{ name: "isDisabled", type: "boolean", defaultValue: false }],
};
