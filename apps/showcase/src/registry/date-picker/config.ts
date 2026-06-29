import type { ComponentRegistryConfig } from "../types";

export const datePickerConfig: ComponentRegistryConfig = {
  name: "Date Picker",
  slug: "date-picker",
  category: "date-time",
  description: "Date Picker component showcase.",
  controls: [
    { name: "label", type: "string", defaultValue: "Event date" },
    { name: "description", type: "string", defaultValue: "" },
    { name: "errorMessage", type: "string", defaultValue: "" },
    {
      name: "labelMode",
      type: "enum",
      options: ["prop", "element"],
      defaultValue: "element",
    },
    { name: "isDisabled", type: "boolean", defaultValue: false },
    { name: "isRequired", type: "boolean", defaultValue: false },
    { name: "isInvalid", type: "boolean", defaultValue: false },
  ],
};
