import type { ComponentRegistryConfig } from "../types";

export const sliderConfig: ComponentRegistryConfig = {
  name: "Slider",
  slug: "slider",
  category: "forms",
  description: "Slider component showcase.",
  controls: [
    { name: "aria-label", type: "string", defaultValue: "Volume" },
    { name: "defaultValue", type: "number", defaultValue: 50 },
    { name: "minValue", type: "number", defaultValue: 0 },
    { name: "maxValue", type: "number", defaultValue: 100 },
    { name: "step", type: "number", defaultValue: 1 },
  ],
};
