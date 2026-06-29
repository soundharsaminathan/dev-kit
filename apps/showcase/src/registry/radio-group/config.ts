import type { ComponentRegistryConfig } from "../types";

export const radioGroupConfig: ComponentRegistryConfig = {
  name: "Radio Group",
  slug: "radio-group",
  category: "forms",
  description: "Radio Group component showcase.",
  controls: [
    { name: "label", type: "string", defaultValue: "Plan" },
    { name: "description", type: "string" },
    { name: "errorMessage", type: "string" },
    {
      name: "defaultValue",
      type: "enum",
      options: ["free", "pro", "enterprise"],
      defaultValue: "free",
    },
    {
      name: "orientation",
      type: "enum",
      options: ["horizontal", "vertical"],
      defaultValue: "vertical",
    },
    { name: "isDisabled", type: "boolean", defaultValue: false },
    { name: "isReadOnly", type: "boolean" },
    { name: "isRequired", type: "boolean" },
    { name: "isInvalid", type: "boolean", defaultValue: false },
  ],
};
