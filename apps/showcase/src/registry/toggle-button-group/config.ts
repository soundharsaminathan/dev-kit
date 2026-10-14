import type { ComponentRegistryConfig } from "../types";

export const toggleButtonGroupConfig: ComponentRegistryConfig = {
  name: "Toggle Button Group",
  slug: "toggle-button-group",
  category: "buttons",
  description: "Toggle Button Group component showcase.",
  controls: [
    {
      name: "variant",
      type: "enum",
      options: ["default", "primary", "quiet", "segmented"],
      defaultValue: "default",
    },
    {
      name: "size",
      type: "enum",
      options: ["xs", "sm", "md", "lg"],
      defaultValue: "md",
    },
  ],
};
