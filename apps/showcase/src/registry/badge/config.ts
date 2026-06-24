import type { ComponentRegistryConfig } from "../types";

export const badgeConfig: ComponentRegistryConfig = {
  name: "Badge",
  slug: "badge",
  category: "typography",
  description: "Badge component showcase.",
  controls: [{ name: "children", type: "string", defaultValue: "Badge" }],
};
