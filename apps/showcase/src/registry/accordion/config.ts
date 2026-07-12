import type { ComponentRegistryConfig } from "../types";

export const accordionConfig: ComponentRegistryConfig = {
  name: "Accordion",
  slug: "accordion",
  category: "navigation",
  description: "Accordion component showcase.",
  controls: [
    { name: "allowsMultipleExpanded", type: "boolean", defaultValue: false },
    {
      name: "defaultExpandedKey",
      type: "enum",
      options: ["none", "getting-started", "customization", "typescript"],
      defaultValue: "none",
      visual: false,
    },
  ],
};
