import type { ComponentRegistryConfig } from "../types";

export const badgeConfig: ComponentRegistryConfig = {
  name: "Badge",
  slug: "badge",
  category: "typography",
  description: "Badge component showcase.",
  controls: [
    {
      name: "appearance",
      type: "enum",
      options: ["solid", "subtle"],
      defaultValue: "solid",
    },
    {
      name: "variant",
      type: "enum",
      options: ["neutral", "accent", "danger", "success", "warning", "info"],
      defaultValue: "neutral",
    },
    {
      name: "size",
      type: "enum",
      options: ["sm", "md", "lg"],
      defaultValue: "md",
    },
    { name: "children", type: "string", defaultValue: "Badge" },
  ],
};
