import type { ComponentRegistryConfig } from "../types";

export const inputGroupConfig: ComponentRegistryConfig = {
  name: "Input Group",
  slug: "input-group",
  category: "forms",
  description: "Input Group component showcase.",
  controls: [{ name: "children", type: "string", defaultValue: "InputGroup" }],
};
