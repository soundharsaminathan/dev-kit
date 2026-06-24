import type { ComponentRegistryConfig } from "../types";

export const headingConfig: ComponentRegistryConfig = {
  name: "Heading",
  slug: "heading",
  category: "typography",
  description: "Heading component showcase.",
  controls: [{ name: "children", type: "string", defaultValue: "Heading" }],
};
