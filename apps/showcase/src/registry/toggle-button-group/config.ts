import type { ComponentRegistryConfig } from "../types";

export const toggleButtonGroupConfig: ComponentRegistryConfig = {
  name: "Toggle Button Group",
  slug: "toggle-button-group",
  category: "buttons",
  description: "Toggle Button Group component showcase.",
  controls: [
    { name: "children", type: "string", defaultValue: "ToggleButtonGroup" },
  ],
};
