import type { ComponentRegistryConfig } from "../types";

export const inputConfig: ComponentRegistryConfig = {
  name: "Input",
  slug: "input",
  category: "forms",
  description: "Input component showcase.",
  controls: [{ name: "children", type: "string", defaultValue: "Input" }],
};
