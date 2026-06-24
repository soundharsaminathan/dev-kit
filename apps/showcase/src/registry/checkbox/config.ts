import type { ComponentRegistryConfig } from "../types";

export const checkboxConfig: ComponentRegistryConfig = {
  name: "Checkbox",
  slug: "checkbox",
  category: "forms",
  description: "Checkbox component showcase.",
  controls: [
    { name: "children", type: "string", defaultValue: "Accept terms" },
    { name: "defaultSelected", type: "boolean", defaultValue: false },
    { name: "isIndeterminate", type: "boolean", defaultValue: false },
    { name: "isDisabled", type: "boolean", defaultValue: false },
    { name: "isInvalid", type: "boolean", defaultValue: false },
  ],
};
