import type { ComponentRegistryConfig } from "../types";

export const gridListConfig: ComponentRegistryConfig = {
  name: "Grid List",
  slug: "grid-list",
  category: "layout",
  description: "Grid List component showcase.",
  controls: [
    { name: "aria-label", type: "string", defaultValue: "Files" },
    {
      name: "selectionMode",
      type: "enum",
      options: ["single", "multiple", "none"],
      defaultValue: "single",
    },
  ],
};
