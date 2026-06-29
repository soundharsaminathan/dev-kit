import type { ComponentRegistryConfig } from "../types";

export const tabsConfig: ComponentRegistryConfig = {
  name: "Tabs",
  slug: "tabs",
  category: "navigation",
  description: "Tabs component showcase.",
  controls: [
    { name: "aria-label", type: "string", defaultValue: "Account settings" },
    {
      name: "defaultSelectedKey",
      type: "enum",
      options: ["account", "password"],
      defaultValue: "account",
    },
    {
      name: "orientation",
      type: "enum",
      options: ["horizontal", "vertical"],
      defaultValue: "horizontal",
    },
    {
      name: "variant",
      type: "enum",
      options: ["default", "line"],
      defaultValue: "default",
    },
    { name: "isDisabled", type: "boolean", defaultValue: false },
  ],
};
