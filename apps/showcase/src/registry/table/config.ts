import type { ComponentRegistryConfig } from "../types";

export const tableConfig: ComponentRegistryConfig = {
  name: "Table",
  slug: "table",
  category: "layout",
  description: "Table component showcase.",
  controls: [
    { name: "ariaLabel", type: "string", defaultValue: "Users" },
    { name: "enableSorting", type: "boolean", defaultValue: false },
  ],
};
