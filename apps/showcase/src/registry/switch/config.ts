import type { ComponentRegistryConfig } from "../types";

export const switchConfig: ComponentRegistryConfig = {
  name: "Switch",
  slug: "switch",
  category: "forms",
  description: "Toggle a single setting on or off.",
  scale: 1,
  controls: [
    { name: "children", type: "string", defaultValue: "Notifications" },
    {
      name: "size",
      type: "enum",
      options: ["sm", "md", "lg"],
      defaultValue: "md",
    },
    { name: "defaultSelected", type: "boolean", defaultValue: false },
    { name: "isDisabled", type: "boolean", defaultValue: false },
  ],
};
