import type { ComponentRegistryConfig } from "../types";

export const menuConfig: ComponentRegistryConfig = {
  name: "Menu",
  slug: "menu",
  category: "overlays",
  description: "Menu component showcase.",
  controls: [
    { name: "triggerLabel", type: "string", defaultValue: "Actions" },
    {
      name: "placement",
      type: "enum",
      options: ["bottom", "top", "left", "right", "bottom start", "bottom end"],
      defaultValue: "bottom start",
    },
    { name: "showDangerItem", type: "boolean", defaultValue: true },
  ],
};
