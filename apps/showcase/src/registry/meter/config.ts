import type { ComponentRegistryConfig } from "../types";

export const meterConfig: ComponentRegistryConfig = {
  name: "Meter",
  slug: "meter",
  category: "typography",
  description: "Meter component showcase.",
  controls: [
    { name: "minValue", type: "number", defaultValue: 0 },
    { name: "maxValue", type: "number", defaultValue: 100 },
    { name: "aria-label", type: "string", defaultValue: "Storage used" },
    { name: "value", type: "number", defaultValue: 60 },
  ],
};
