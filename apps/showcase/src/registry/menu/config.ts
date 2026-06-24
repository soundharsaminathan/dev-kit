import type { ComponentRegistryConfig } from "../types";

export const menuConfig: ComponentRegistryConfig = {
  name: "Menu",
  slug: "menu",
  category: "overlays",
  description: "Menu component showcase.",
  controls: [{ name: "triggerLabel", type: "string", defaultValue: "Actions" }],
};
