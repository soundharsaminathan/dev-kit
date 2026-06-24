import type { ComponentRegistryConfig } from "../types";

export const contextMenuConfig: ComponentRegistryConfig = {
  name: "Context Menu",
  slug: "context-menu",
  category: "overlays",
  description: "Context Menu component showcase.",
  controls: [
    { name: "aria-label", type: "string", defaultValue: "Actions" },
    { name: "isDisabled", type: "boolean", defaultValue: false },
    { name: "defaultOpen", type: "boolean", defaultValue: false },
  ],
};
