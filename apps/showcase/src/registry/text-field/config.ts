import type { ComponentRegistryConfig } from "../types";

export const textFieldConfig: ComponentRegistryConfig = {
  name: "Text Field",
  slug: "text-field",
  category: "forms",
  description: "Text Field component showcase.",
  controls: [{ name: "children", type: "string", defaultValue: "TextField" }],
};
