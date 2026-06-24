import type { ComponentRegistryConfig } from "../types";

export const linkConfig: ComponentRegistryConfig = {
  name: "Link",
  slug: "link",
  category: "typography",
  description: "Link component showcase.",
  controls: [{ name: "children", type: "string", defaultValue: "Link" }],
};
