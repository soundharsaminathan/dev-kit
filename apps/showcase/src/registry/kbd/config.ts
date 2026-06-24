import type { ComponentRegistryConfig } from "../types";

export const kbdConfig: ComponentRegistryConfig = {
  name: "Kbd",
  slug: "kbd",
  category: "typography",
  description: "Kbd component showcase.",
  controls: [
    { name: "children", type: "string", defaultValue: "K" },
    { name: "showGroup", type: "boolean", defaultValue: false },
    { name: "modifierKey", type: "string", defaultValue: "⌘" },
  ],
};
