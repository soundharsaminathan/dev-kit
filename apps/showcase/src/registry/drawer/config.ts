import type { ComponentRegistryConfig } from "../types";

export const drawerConfig: ComponentRegistryConfig = {
  name: "Drawer",
  slug: "drawer",
  category: "overlays",
  description: "Drawer component showcase.",
  controls: [
    {
      name: "placement",
      type: "enum",
      options: ["top", "bottom", "left", "right"],
      defaultValue: "bottom",
    },
    { name: "title", type: "string", defaultValue: "Drawer title" },
    {
      name: "body",
      type: "string",
      defaultValue: "Swipe down or click outside to dismiss.",
    },
  ],
};
