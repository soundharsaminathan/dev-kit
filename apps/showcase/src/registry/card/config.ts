import type { ComponentRegistryConfig } from "../types";

export const cardConfig: ComponentRegistryConfig = {
  name: "Card",
  slug: "card",
  category: "layout",
  description: "Card component showcase.",
  controls: [
    {
      name: "size",
      type: "enum",
      options: ["sm", "default"],
      defaultValue: "default",
    },
    { name: "title", type: "string", defaultValue: "Card title" },
    { name: "description", type: "string", defaultValue: "Card description" },
    { name: "content", type: "string", defaultValue: "Main content" },
    { name: "footer", type: "string", defaultValue: "Footer actions" },
  ],
};
