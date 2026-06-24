import type { ComponentRegistryConfig } from "../types";

export const buttonConfig: ComponentRegistryConfig = {
  name: "Button",
  slug: "button",
  category: "buttons",
  description: "Triggers an action or navigation.",
  scale: 1,
  controls: [
    { name: "children", type: "string", defaultValue: "Button" },
    {
      name: "variant",
      type: "enum",
      options: ["default", "primary", "quiet", "link", "warning", "danger"],
      defaultValue: "default",
    },
    {
      name: "size",
      type: "enum",
      options: ["xs", "sm", "md", "lg"],
      defaultValue: "md",
    },
    { name: "disabled", type: "boolean", defaultValue: false },
    { name: "isPending", type: "boolean", defaultValue: false },
  ],
};
