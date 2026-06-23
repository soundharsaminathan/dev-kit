import type { ComponentRegistryConfig } from "../types";

export const scrollFadeConfig: ComponentRegistryConfig = {
  name: "Scroll Fade",
  slug: "scroll-fade",
  category: "layout",
  description: "Scroll Fade component showcase.",
  controls: [{ name: "children", type: "string", defaultValue: "ScrollFade" }],
};
