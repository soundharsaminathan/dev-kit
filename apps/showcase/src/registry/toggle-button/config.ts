import type { ComponentRegistryConfig } from "../types";

export const toggleButtonConfig: ComponentRegistryConfig = {
  name: "Toggle Button",
  slug: "toggle-button",
  category: "buttons",
  description: "Toggle Button component showcase.",
  controls: [
    {
      name: "variant",
      type: "enum",
      options: ["default", "primary", "quiet"],
      defaultValue: "default",
    },
    {
      name: "size",
      type: "enum",
      options: ["xs", "sm", "md", "lg"],
      defaultValue: "md",
    },
    { name: "children", type: "string", defaultValue: "Bold" },
  ],
};
