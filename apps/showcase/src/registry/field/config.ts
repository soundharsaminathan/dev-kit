import type { ComponentRegistryConfig } from "../types";

export const fieldConfig: ComponentRegistryConfig = {
  name: "Field",
  slug: "field",
  category: "forms",
  description: "Field component showcase.",
  controls: [{ name: "children", type: "string", defaultValue: "Field" }],
};
