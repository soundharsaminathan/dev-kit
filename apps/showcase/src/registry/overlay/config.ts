import type { ComponentRegistryConfig } from "../types";

export const overlayConfig: ComponentRegistryConfig = {
  name: "Overlay",
  slug: "overlay",
  category: "layout",
  description: "Overlay component showcase.",
  controls: [
    { name: "defaultOpen", type: "boolean", defaultValue: true },
    {
      name: "type",
      type: "enum",
      options: ["modal", "popover", "drawer"],
      defaultValue: "modal",
    },
    {
      name: "mobileType",
      type: "enum",
      options: ["modal", "popover", "drawer"],
      defaultValue: "drawer",
    },
    { name: "title", type: "string", defaultValue: "Overlay title" },
    {
      name: "description",
      type: "string",
      defaultValue: "This overlay adapts based on screen size.",
    },
    {
      name: "body",
      type: "string",
      defaultValue: "Overlay content goes here.",
    },
  ],
};
