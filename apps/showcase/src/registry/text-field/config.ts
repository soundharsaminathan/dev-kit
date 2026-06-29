import type { ComponentRegistryConfig } from "../types";

export const textFieldConfig: ComponentRegistryConfig = {
  name: "Text Field",
  slug: "text-field",
  category: "forms",
  description: "Text Field component showcase.",
  controls: [
    {
      name: "orientation",
      type: "enum",
      options: ["horizontal", "vertical"],
      defaultValue: "vertical",
    },
    { name: "label", type: "string", defaultValue: "Email" },
    { name: "placeholder", type: "string", defaultValue: "you@example.com" },
    { name: "showDescription", type: "boolean", defaultValue: true },
    {
      name: "description",
      type: "string",
      defaultValue: "We will send updates to this address.",
    },
    { name: "showError", type: "boolean", defaultValue: false },
    { name: "errorMessage", type: "string", defaultValue: "Email is required" },
  ],
};
