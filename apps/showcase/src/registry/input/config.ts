import type { ComponentRegistryConfig } from "../types";

export const inputConfig: ComponentRegistryConfig = {
  name: "Input",
  slug: "input",
  category: "forms",
  description: "Input component showcase.",
  controls: [
    {
      name: "size",
      type: "enum",
      options: ["sm", "md", "lg"],
      defaultValue: "md",
    },
    { name: "disabled", type: "boolean" },
    { name: "placeholder", type: "string", defaultValue: "Enter text" },
  ],
};
