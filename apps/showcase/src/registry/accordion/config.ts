import type { ComponentRegistryConfig } from "../types";

export const accordionConfig: ComponentRegistryConfig = {
  name: "Accordion",
  slug: "accordion",
  category: "navigation",
  description: "Accordion component showcase.",
  controls: [
    { name: "allowsMultipleExpanded", type: "boolean", defaultValue: false },
  ],
};
