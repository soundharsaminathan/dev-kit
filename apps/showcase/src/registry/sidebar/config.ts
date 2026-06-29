import type { ComponentRegistryConfig } from "../types";

export const sidebarConfig: ComponentRegistryConfig = {
  name: "Sidebar",
  slug: "sidebar",
  category: "layout",
  description: "Sidebar component showcase.",
  controls: [
    { name: "defaultOpen", type: "boolean", defaultValue: true },
    {
      name: "placement",
      type: "enum",
      options: ["left", "right"],
      defaultValue: "left",
    },
  ],
};
