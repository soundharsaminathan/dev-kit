import type { ComponentRegistryConfig } from "../types";

export const textConfig: ComponentRegistryConfig = {
  name: "Text",
  slug: "text",
  category: "typography",
  description: "Text component showcase.",
  controls: [
    {
      name: "children",
      type: "string",
      defaultValue: "Helper text for a field.",
    },
    {
      name: "slot",
      type: "enum",
      options: ["label", "description", "errorMessage"],
    },
  ],
};
