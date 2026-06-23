import type { ComponentRegistryConfig } from "../types";

export const toolbarConfig: ComponentRegistryConfig = {
  name: "Toolbar",
  slug: "toolbar",
  category: "navigation",
  description: "Toolbar component showcase.",
  controls: [
    {
      name: "orientation",
      type: "enum",
      options: ["horizontal", "vertical"],
      defaultValue: "horizontal",
    },
    { name: "aria-label", type: "string", defaultValue: "Formatting" },
  ],
};
