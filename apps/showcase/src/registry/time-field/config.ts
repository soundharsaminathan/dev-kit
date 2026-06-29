import type { ComponentRegistryConfig } from "../types";

export const timeFieldConfig: ComponentRegistryConfig = {
  name: "Time Field",
  slug: "time-field",
  category: "date-time",
  description: "Time Field component showcase.",
  controls: [
    { name: "label", type: "string", defaultValue: "Meeting time" },
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
