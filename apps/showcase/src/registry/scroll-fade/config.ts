import type { ComponentRegistryConfig } from "../types";

export const scrollFadeConfig: ComponentRegistryConfig = {
  name: "Scroll Fade",
  slug: "scroll-fade",
  category: "layout",
  description: "Scroll Fade component showcase.",
  controls: [
    {
      name: "direction",
      type: "enum",
      options: ["vertical", "horizontal"],
      defaultValue: "vertical",
    },
    { name: "itemCount", type: "number", defaultValue: 20 },
    { name: "width", type: "number", defaultValue: 240 },
    { name: "height", type: "number", defaultValue: 160 },
  ],
};
