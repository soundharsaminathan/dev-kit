import type { ComponentRegistryConfig } from "../types";

export const autocompleteConfig: ComponentRegistryConfig = {
  name: "Autocomplete",
  slug: "autocomplete",
  category: "overlays",
  description: "Autocomplete component showcase.",
  controls: [
    { name: "ariaLabel", type: "string", defaultValue: "Autocomplete menu" },
    { name: "placeholder", type: "string", defaultValue: "Type to search..." },
    {
      name: "variant",
      type: "enum",
      options: ["default", "borderless"],
      defaultValue: "default",
    },
  ],
};
