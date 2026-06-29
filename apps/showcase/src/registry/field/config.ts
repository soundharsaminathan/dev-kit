import type { ComponentRegistryConfig } from "../types";

export const fieldConfig: ComponentRegistryConfig = {
  name: "Field",
  slug: "field",
  category: "forms",
  description: "Field component showcase.",
  controls: [
    {
      name: "orientation",
      type: "enum",
      options: ["horizontal", "vertical"],
      defaultValue: "vertical",
    },
    { name: "labelText", type: "string", defaultValue: "Email" },
    {
      name: "descriptionText",
      type: "string",
      defaultValue: "We will send updates to this address.",
    },
    { name: "placeholder", type: "string", defaultValue: "you@example.com" },
    { name: "errorMessage", type: "string", defaultValue: "Email is required" },
    { name: "showError", type: "boolean", defaultValue: false },
  ],
};
