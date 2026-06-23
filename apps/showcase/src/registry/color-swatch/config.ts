import type { ComponentRegistryConfig } from "../types";

export const colorSwatchConfig: ComponentRegistryConfig = {
  name: "Color Swatch",
  slug: "color-swatch",
  category: "color",
  description: "Color Swatch component showcase.",
  controls: [{ name: "color", type: "string", defaultValue: "#6366f1" }],
};
