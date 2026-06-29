import type { ComponentRegistryConfig } from "../types";

export const dateRangePickerConfig: ComponentRegistryConfig = {
  name: "Date Range Picker",
  slug: "date-range-picker",
  category: "date-time",
  description: "Date Range Picker component showcase.",
  controls: [
    { name: "label", type: "string", defaultValue: "Trip dates" },
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
