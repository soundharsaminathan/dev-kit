import type { ComponentRegistryConfig } from "../types";

export const cardConfig: ComponentRegistryConfig = {
  name: "Card",
  slug: "card",
  category: "layout",
  description: "Card component showcase.",
  controls: [{ name: "children", type: "string", defaultValue: "Card" }],
};
