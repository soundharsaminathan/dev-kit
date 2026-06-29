import type { ComponentRegistryConfig } from "../types";

export const numberFieldConfig: ComponentRegistryConfig = {
  name: "Number Field",
  slug: "number-field",
  category: "forms",
  description: "Number Field component showcase.",
  controls: [
    { name: "aria-label", type: "string", defaultValue: "Quantity" },
    { name: "labelText", type: "string", defaultValue: "Quantity" },
    {
      name: "descriptionText",
      type: "string",
      defaultValue: "Choose how many items to order.",
    },
    { name: "showLabel", type: "boolean", defaultValue: false },
    { name: "defaultValue", type: "number", defaultValue: 5 },
    { name: "minValue", type: "number", defaultValue: 0 },
    { name: "maxValue", type: "number", defaultValue: 100 },
    { name: "step", type: "number", defaultValue: 1 },
    {
      name: "inputSize",
      type: "enum",
      options: ["sm", "md", "lg"],
      defaultValue: "md",
    },
    { name: "isDisabled", type: "boolean", defaultValue: false },
    { name: "isInvalid", type: "boolean", defaultValue: false },
    { name: "isRequired", type: "boolean", defaultValue: false },
  ],
};
