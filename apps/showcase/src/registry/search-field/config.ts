import type { ComponentRegistryConfig } from "../types";

export const searchFieldConfig: ComponentRegistryConfig = {
  name: "Search Field",
  slug: "search-field",
  category: "forms",
  description: "Search Field component showcase.",
  controls: [
    { name: "aria-label", type: "string", defaultValue: "Search" },
    { name: "placeholder", type: "string", defaultValue: "Search..." },
    { name: "isDisabled", type: "boolean", defaultValue: false },
    { name: "isRequired", type: "boolean", defaultValue: false },
    { name: "isReadOnly", type: "boolean", defaultValue: false },
    { name: "showLabel", type: "boolean", defaultValue: false },
    { name: "labelText", type: "string", defaultValue: "Search" },
  ],
};
