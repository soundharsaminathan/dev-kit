import type { ComponentRegistryConfig } from "../types";

export const popoverConfig: ComponentRegistryConfig = {
  name: "Popover",
  slug: "popover",
  category: "overlays",
  description: "Popover component showcase.",
  controls: [
    { name: "defaultOpen", type: "boolean", defaultValue: true },
    { name: "isNonModal", type: "boolean", defaultValue: false },
    {
      name: "placement",
      type: "enum",
      options: ["top", "bottom"],
      defaultValue: "bottom",
    },
    { name: "content", type: "string", defaultValue: "Popover content" },
  ],
};
