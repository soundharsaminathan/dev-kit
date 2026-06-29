import type { ComponentRegistryConfig } from "../types";

export const inputGroupConfig: ComponentRegistryConfig = {
  name: "Input Group",
  slug: "input-group",
  category: "forms",
  description: "Input Group component showcase.",
  controls: [
    {
      name: "size",
      type: "enum",
      options: ["sm", "md", "lg"],
      defaultValue: "md",
    },
    { name: "isDisabled", type: "boolean", defaultValue: false },
    { name: "isInvalid", type: "boolean", defaultValue: false },
    {
      name: "addonPosition",
      type: "enum",
      options: ["leading", "trailing"],
      defaultValue: "leading",
    },
    { name: "addonText", type: "string", defaultValue: "https://" },
    { name: "placeholder", type: "string", defaultValue: "example.com" },
    { name: "ariaLabel", type: "string", defaultValue: "Website" },
  ],
};
