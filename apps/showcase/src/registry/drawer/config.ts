import type { ComponentRegistryConfig } from "../types";

export const drawerConfig: ComponentRegistryConfig = {
  name: "Drawer",
  slug: "drawer",
  category: "overlays",
  description: "Drawer component showcase.",
  controls: [{ name: "children", type: "string", defaultValue: "Drawer" }],
};
