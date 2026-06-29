import type { ComponentRegistryConfig } from "../types";

export const headingConfig: ComponentRegistryConfig = {
  name: "Heading",
  slug: "heading",
  category: "typography",
  description: "Heading component showcase.",
  controls: [
    { name: "level", type: "number", defaultValue: 1, min: 1, max: 6, step: 1 },
    { name: "children", type: "string", defaultValue: "Section title" },
  ],
};
