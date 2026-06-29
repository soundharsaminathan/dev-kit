import type { ComponentRegistryConfig } from "../types";

export const keyboardConfig: ComponentRegistryConfig = {
  name: "Keyboard",
  slug: "keyboard",
  category: "typography",
  description: "Keyboard component showcase.",
  controls: [
    { name: "children", type: "string", defaultValue: "K" },
    { name: "showGroup", type: "boolean", defaultValue: true },
    { name: "modifierKey", type: "string", defaultValue: "⌘" },
  ],
};
