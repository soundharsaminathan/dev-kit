import type { ComponentRegistryConfig } from "../types";

export const tabsConfig: ComponentRegistryConfig = {
  name: "Tabs",
  slug: "tabs",
  category: "navigation",
  description: "Tabs component showcase.",
  controls: [
    { name: "aria-label", type: "string", defaultValue: "Account settings" },
  ],
};
