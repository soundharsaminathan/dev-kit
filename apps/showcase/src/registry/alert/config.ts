import type { ComponentRegistryConfig } from "../types";

export const alertConfig: ComponentRegistryConfig = {
  name: "Alert",
  slug: "alert",
  category: "layout",
  description: "Alert component showcase.",
  controls: [{ name: "children", type: "string", defaultValue: "Alert" }],
};
