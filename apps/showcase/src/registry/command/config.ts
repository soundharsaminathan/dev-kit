import type { ComponentRegistryConfig } from "../types";

export const commandConfig: ComponentRegistryConfig = {
  name: "Command",
  slug: "command",
  category: "overlays",
  description: "Command component showcase.",
  controls: [
    { name: "ariaLabel", type: "string", defaultValue: "Command menu" },
    {
      name: "placeholder",
      type: "string",
      defaultValue: "Type a command or search...",
    },
  ],
};
