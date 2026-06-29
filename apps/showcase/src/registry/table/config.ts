import type { ComponentRegistryConfig } from "../types";

export const tableConfig: ComponentRegistryConfig = {
  name: "Table",
  slug: "table",
  category: "layout",
  description: "Table component showcase.",
  controls: [
    { name: "ariaLabel", type: "string", defaultValue: "Users" },
    { name: "enableSorting", type: "boolean", defaultValue: false },
    {
      name: "initialSortColumn",
      type: "enum",
      options: ["name", "email", "role"],
      defaultValue: "name",
    },
    {
      name: "initialSortDirection",
      type: "enum",
      options: ["ascending", "descending"],
      defaultValue: "ascending",
    },
    {
      name: "selectionMode",
      type: "enum",
      options: ["none", "single", "multiple"],
      defaultValue: "none",
    },
  ],
};
