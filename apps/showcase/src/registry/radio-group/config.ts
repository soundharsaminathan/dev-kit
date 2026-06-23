import type { ComponentRegistryConfig } from "../types";

export const radioGroupConfig: ComponentRegistryConfig = {
  name: "Radio Group",
  slug: "radio-group",
  category: "forms",
  description: "Radio Group component showcase.",
  controls: [
    { name: "label", type: "string", defaultValue: "Plan" },
    { name: "description", type: "string" },
    { name: "errorMessage", type: "string" },
  ],
};
