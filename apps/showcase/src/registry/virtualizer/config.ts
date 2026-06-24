import type { ComponentRegistryConfig } from "../types";

export const virtualizerConfig: ComponentRegistryConfig = {
  name: "Virtualizer",
  slug: "virtualizer",
  category: "layout",
  description: "Virtualizer component showcase.",
  controls: [
    { name: "aria-label", type: "string", defaultValue: "Virtual list" },
  ],
};
