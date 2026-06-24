import type { ComponentRegistryConfig } from "../types";

export const checkboxGroupConfig: ComponentRegistryConfig = {
  name: "Checkbox Group",
  slug: "checkbox-group",
  category: "forms",
  description: "Checkbox Group component showcase.",
  controls: [
    { name: "aria-label", type: "string", defaultValue: "Notifications" },
    { name: "description", type: "string" },
    { name: "errorMessage", type: "string" },
  ],
};
