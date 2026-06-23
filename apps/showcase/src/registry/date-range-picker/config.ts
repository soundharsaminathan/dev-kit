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
  ],
};
