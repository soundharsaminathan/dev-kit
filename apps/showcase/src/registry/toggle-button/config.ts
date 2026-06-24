import type { ComponentRegistryConfig } from "../types";

export const toggleButtonConfig: ComponentRegistryConfig = {
  name: "Toggle Button",
  slug: "toggle-button",
  category: "buttons",
  description: "Toggle Button component showcase.",
  controls: [
    { name: "children", type: "string", defaultValue: "ToggleButton" },
  ],
};
